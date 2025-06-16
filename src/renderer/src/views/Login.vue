<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@renderer/lib/axios'
import { toast, type ToastOptions } from 'vue3-toastify'
import { useAuthStore } from '@renderer/stores/authStore'
import { startupCheck } from '@renderer/helpers/startupCheck'

const auth = useAuthStore()

const email = ref('jrdemadara@protonmail.com')
const password = ref('E=mc2')
const loading = ref(false)
const router = useRouter()

const login = async () => {
  loading.value = true
  try {
    const res = await api.post('/login', {
      email: email.value,
      password: password.value
    })

    const { access_token } = res.data
    auth.setToken(access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    startupCheck()
    router.push('/')
  } catch (error: any) {
    if (error.response?.status === 401) {
      toast.error('Invalid credentials. Please check your email and password.', {
        position: toast.POSITION.TOP_RIGHT
      })
    } else {
      console.error('Login failed:', error)
      toast.error('Login failed: ' + (error.message || 'Unknown error'), {
        position: toast.POSITION.TOP_RIGHT
      })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full w-full justify-center items-center">
    <form @submit.prevent="login">
      <div class="flex flex-col justify-center items-center space-y-4">
        <h4 class="text-start w-full">Authenticate</h4>
        <label class="floating-label">
          <span>Email</span>
          <input v-model="email" type="email" class="input w-72" />
        </label>
        <label class="floating-label">
          <span>Password</span>
          <input v-model="password" type="password" class="input w-72" placeholder="Password" />
        </label>
        <button :disabled="loading" type="submit" class="btn btn-primary w-full">
          <div v-show="loading" class="loading loading-spinner"></div>
          Login
        </button>
      </div>
    </form>
  </div>
</template>
