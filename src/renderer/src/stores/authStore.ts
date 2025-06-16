import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('api_token'))

  function setToken(newToken: string) {
    token.value = newToken
  }

  function clearToken() {
    token.value = null
  }

  // Persist token to localStorage
  watch(token, (newValue) => {
    if (newValue) {
      localStorage.setItem('api_token', newValue)
    } else {
      localStorage.removeItem('api_token')
    }
  })

  return { token, setToken, clearToken }
})
