import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'
import { ROLE_HIERARCHY } from '@/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/landing',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/board/:id',
      name: 'board',
      component: () => import('@/views/BoardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/activity',
      name: 'activity',
      component: () => import('@/views/ActivityView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/views/MessagesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true, minRole: 'ADMIN' as Role },
    },
    {
      path: '/director',
      name: 'director',
      component: () => import('@/views/DirectorView.vue'),
      meta: { requiresAuth: true, minRole: 'DIRECTOR' as Role },
    },
    {
      path: '/manager',
      name: 'manager',
      component: () => import('@/views/ManagerView.vue'),
      meta: { requiresAuth: true, minRole: 'MANAGER' as Role },
    },
    {
      path: '/team-leader',
      name: 'team-leader',
      component: () => import('@/views/TeamLeaderView.vue'),
      meta: { requiresAuth: true, minRole: 'TEAM_LEADER' as Role },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/landing',
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    await authStore.fetchMe()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/landing')
  } else if (to.meta.minRole && authStore.user) {
    const minRole = to.meta.minRole as Role
    const userRole = authStore.user.role
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
      next('/')
    } else {
      next()
    }
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
