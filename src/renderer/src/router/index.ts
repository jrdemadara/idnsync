// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@renderer/stores/authStore'
import Settings from '@renderer/views/Settings.vue'
import Login from '@renderer/views/Login.vue'
import Home from '@renderer/views/Home.vue'
import AuthenticatedLayout from '@renderer/layouts/AuthenticatedLayout.vue'
import GuestLayout from '@renderer/layouts/GuestLayout.vue'
// You can add more views here
// import Dashboard from '../components/Dashboard.vue'

const routes = [
  {
    path: '/',
    component: AuthenticatedLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: Home },
      { path: 'settings', name: 'settings', component: Settings }
    ]
  },
  {
    path: '/login',
    component: GuestLayout,
    meta: { guestOnly: true },
    children: [{ path: '', name: 'login', component: Login }]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 🛡 Global Navigation Guard
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isLoggedIn = !!auth.token

  if (to.meta.requiresAuth && !isLoggedIn) {
    return next({ name: 'login' })
  }

  if (to.meta.guestOnly && isLoggedIn) {
    return next({ name: 'home' })
  }

  next()
})

export default router
