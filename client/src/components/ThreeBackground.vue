<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(defineProps<{
  density?: number
  speed?: number
  colorMode?: 'aurora' | 'ocean' | 'sunset'
}>(), {
  density: 100,
  speed: 0.5,
  colorMode: 'aurora',
})

const themeStore = useThemeStore()
const canvasContainer = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let animationId: number
let mouseX = 0
let mouseY = 0
let targetMouseX = 0
let targetMouseY = 0
let scrollY = 0

const geometries: THREE.BufferGeometry[] = []
const materials: THREE.Material[] = []
const meshes: THREE.Object3D[] = []

const colorPalettes = {
  aurora: {
    primary: new THREE.Color(0x06b6d4),
    secondary: new THREE.Color(0xa855f7),
    accent: new THREE.Color(0x10b981),
    fog: new THREE.Color(0x083344),
  },
  ocean: {
    primary: new THREE.Color(0x0ea5e9),
    secondary: new THREE.Color(0x6366f1),
    accent: new THREE.Color(0x06b6d4),
    fog: new THREE.Color(0x0c4a6e),
  },
  sunset: {
    primary: new THREE.Color(0xf59e0b),
    secondary: new THREE.Color(0xef4444),
    accent: new THREE.Color(0xec4899),
    fog: new THREE.Color(0x7c2d12),
  },
}

function init() {
  if (!canvasContainer.value) return

  const container = canvasContainer.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(colorPalettes[props.colorMode].fog.getHex(), 0.008)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200)
  camera.position.set(0, 0, 40)

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  const palette = colorPalettes[props.colorMode]

  // === 1. Floating 3D Geometric Shapes ===
  const shapeConfigs = [
    { geo: new THREE.IcosahedronGeometry(3, 0), pos: [-18, 8, -10], color: palette.primary, speed: 0.3 },
    { geo: new THREE.TorusKnotGeometry(2, 0.6, 80, 16), pos: [20, -5, -15], color: palette.secondary, speed: 0.4 },
    { geo: new THREE.OctahedronGeometry(2.5, 0), pos: [0, 15, -20], color: palette.accent, speed: 0.25 },
    { geo: new THREE.DodecahedronGeometry(2, 0), pos: [-12, -12, -5], color: palette.secondary, speed: 0.35 },
    { geo: new THREE.TetrahedronGeometry(2.2, 0), pos: [15, 12, -8], color: palette.primary, speed: 0.3 },
  ]

  shapeConfigs.forEach((cfg, i) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: cfg.color,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
      transmission: 0.6,
      thickness: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    })
    materials.push(mat)

    const mesh = new THREE.Mesh(cfg.geo, mat)
    mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    mesh.userData = {
      floatSpeed: cfg.speed,
      floatOffset: i * 1.5,
      rotSpeedX: (Math.random() - 0.5) * 0.01,
      rotSpeedY: (Math.random() - 0.5) * 0.01,
      rotSpeedZ: (Math.random() - 0.5) * 0.005,
      baseY: cfg.pos[1],
    }
    geometries.push(cfg.geo)
    meshes.push(mesh)
    scene.add(mesh)
  })

  // === 2. Particle System ===
  const particleCount = props.density
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const speeds = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    const radius = 20 + Math.random() * 40
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi) - 20

    const mixFactor = Math.random()
    const color = mixFactor < 0.33 ? palette.primary : mixFactor < 0.66 ? palette.secondary : palette.accent

    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b

    sizes[i] = Math.random() * 3 + 0.5
    speeds[i] = Math.random() * 0.5 + 0.2
  }

  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
  geometries.push(pGeo)

  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uOpacity: { value: themeStore.isDark ? 0.9 : 0.6 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSpeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vec3 pos = position;

        float wave = sin(uTime * aSpeed + pos.x * 0.1) * 4.0;
        pos.y += wave;
        pos.x += cos(uTime * aSpeed * 0.5 + pos.z * 0.15) * 3.0;
        pos.z += sin(uTime * aSpeed * 0.3 + pos.y * 0.1) * 2.0;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPosition.z);

        vAlpha = smoothstep(100.0, 10.0, -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        float core = 1.0 - smoothstep(0.0, 0.12, dist);
        float ring = smoothstep(0.2, 0.35, dist) * (1.0 - smoothstep(0.35, 0.5, dist));

        vec3 color = vColor * (glow * 0.5 + core * 1.2 + ring * 0.3);
        float alpha = (glow * 0.5 + core * 0.8 + ring * 0.3) * vAlpha * uOpacity;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  materials.push(pMat)

  const particles = new THREE.Points(pGeo, pMat)
  particles.userData.isParticles = true
  meshes.push(particles)
  scene.add(particles)

  // === 3. Morphing Wave Plane ===
  const waveGeo = new THREE.PlaneGeometry(160, 160, 60, 60)
  geometries.push(waveGeo)

  const waveMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: palette.primary },
      uColor2: { value: palette.secondary },
      uOpacity: { value: themeStore.isDark ? 0.2 : 0.1 },
    },
    vertexShader: `
      uniform float uTime;
      varying float vElevation;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float elevation = sin(pos.x * 0.08 + uTime * 0.4) * 3.0
                        + sin(pos.y * 0.12 + uTime * 0.3) * 2.0
                        + sin((pos.x + pos.y) * 0.06 + uTime * 0.6) * 1.5
                        + cos(pos.x * 0.04 - uTime * 0.2) * 2.0;
        pos.z += elevation;
        vElevation = elevation;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uOpacity;
      varying float vElevation;
      varying vec2 vUv;

      void main() {
        float mixStrength = (vElevation + 5.0) / 10.0;
        vec3 color = mix(uColor1, uColor2, mixStrength);
        float edgeFade = smoothstep(0.5, 0.15, distance(vUv, vec2(0.5)));
        float glow = smoothstep(0.3, 0.0, abs(vElevation - 2.0)) * 0.3;
        gl_FragColor = vec4(color + glow * uColor2, uOpacity * edgeFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  materials.push(waveMat)

  const waveMesh = new THREE.Mesh(waveGeo, waveMat)
  waveMesh.rotation.x = -Math.PI / 2.5
  waveMesh.position.y = -22
  waveMesh.position.z = -25
  waveMesh.userData.isWave = true
  meshes.push(waveMesh)
  scene.add(waveMesh)

  // === 4. Energy Rings ===
  const ringGeo = new THREE.TorusGeometry(15, 0.15, 16, 100)
  geometries.push(ringGeo)
  const ringMat = new THREE.MeshBasicMaterial({
    color: palette.primary, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
  })
  materials.push(ringMat)
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.set(0, 0, -30)
  ring.rotation.x = Math.PI / 3
  ring.userData.isRing = true
  meshes.push(ring)
  scene.add(ring)

  const ring2Geo = new THREE.TorusGeometry(12, 0.1, 16, 100)
  geometries.push(ring2Geo)
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: palette.secondary, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending,
  })
  materials.push(ring2Mat)
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
  ring2.position.set(0, 0, -28)
  ring2.rotation.x = -Math.PI / 4
  ring2.rotation.y = Math.PI / 6
  ring2.userData.isRing2 = true
  meshes.push(ring2)
  scene.add(ring2)

  // === 5. Lighting ===
  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  const dirLight = new THREE.DirectionalLight(palette.primary.getHex(), 1)
  dirLight.position.set(10, 10, 10)
  scene.add(dirLight)
  const dirLight2 = new THREE.DirectionalLight(palette.secondary.getHex(), 0.8)
  dirLight2.position.set(-10, -5, 5)
  scene.add(dirLight2)
  const pointLight = new THREE.PointLight(palette.accent.getHex(), 2, 50)
  pointLight.position.set(0, 0, 10)
  scene.add(pointLight)

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
}

function onMouseMove(event: MouseEvent) {
  targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2
  targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2
}

function onScroll() {
  scrollY = window.scrollY
}

function onResize() {
  if (!canvasContainer.value || !camera || !renderer) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const clock = new THREE.Clock()

function animate() {
  animationId = requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()

  mouseX += (targetMouseX - mouseX) * 0.04
  mouseY += (targetMouseY - mouseY) * 0.04
  const scrollOffset = scrollY * 0.01

  meshes.forEach((obj) => {
    if (obj.userData.isParticles) {
      obj.rotation.y = elapsed * 0.02 + mouseX * 0.3
      obj.rotation.x = mouseY * 0.15
      const mat = (obj as THREE.Points).material as THREE.ShaderMaterial
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = elapsed
    } else if (obj.userData.isWave) {
      const mat = (obj as THREE.Mesh).material as THREE.ShaderMaterial
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = elapsed
      obj.rotation.z = elapsed * 0.008
    } else if (obj.userData.isRing) {
      obj.rotation.z = elapsed * 0.3
      obj.rotation.x = Math.PI / 3 + Math.sin(elapsed * 0.2) * 0.2
    } else if (obj.userData.isRing2) {
      obj.rotation.z = -elapsed * 0.4
      obj.rotation.y = Math.PI / 6 + Math.cos(elapsed * 0.15) * 0.3
    } else {
      obj.rotation.x += obj.userData.rotSpeedX
      obj.rotation.y += obj.userData.rotSpeedY
      obj.rotation.z += obj.userData.rotSpeedZ
      obj.position.y = obj.userData.baseY + Math.sin(elapsed * obj.userData.floatSpeed + obj.userData.floatOffset) * 3
    }
  })

  camera.position.x = mouseX * 4
  camera.position.y = -mouseY * 3 - scrollOffset * 0.5
  camera.lookAt(0, 0, -10)

  renderer.render(scene, camera)
}

watch(() => themeStore.isDark, (isDark) => {
  meshes.forEach((obj) => {
    if (obj.userData.isParticles) {
      const mat = (obj as THREE.Points).material as THREE.ShaderMaterial
      if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = isDark ? 0.9 : 0.6
    } else if (obj.userData.isWave) {
      const mat = (obj as THREE.Mesh).material as THREE.ShaderMaterial
      if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = isDark ? 0.2 : 0.1
    }
  })
})

onMounted(() => {
  init()
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  geometries.forEach((g) => g.dispose())
  materials.forEach((m) => m.dispose())
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && canvasContainer.value) {
      canvasContainer.value.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div ref="canvasContainer" class="three-bg-container" />
</template>

<style scoped>
.three-bg-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
