import { ref, onMounted, onUnmounted } from 'vue'

export function useScrollReveal() {
  const observer = ref<IntersectionObserver | null>(null)

  onMounted(() => {
    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('[data-reveal]').forEach((el) => {
      observer.value?.observe(el)
    })
  })

  onUnmounted(() => {
    observer.value?.disconnect()
  })
}

export function useScrollProgress() {
  const progress = ref(0)

  const onScroll = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    progress.value = docHeight > 0 ? scrollTop / docHeight : 0
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return progress
}

export function useTilt() {
  const tiltRef = ref<HTMLElement | null>(null)
  const tiltStyle = ref('')

  const onMouseMove = (e: MouseEvent) => {
    if (!tiltRef.value) return
    const rect = tiltRef.value.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    const rotateX = y * -10
    const rotateY = x * 10
    tiltStyle.value = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
  }

  const onMouseLeave = () => {
    tiltStyle.value = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
  }

  return { tiltRef, tiltStyle, onMouseMove, onMouseLeave }
}
