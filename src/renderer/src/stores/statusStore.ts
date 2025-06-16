import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useStatusStore = defineStore('status', () => {
  const apiStatus = ref(false)
  const databaseStatus = ref(false)
  const checkingStatus = ref(true)

  function setApiStatus(status: boolean) {
    apiStatus.value = status
  }

  function setDatabaseStatus(status: boolean) {
    databaseStatus.value = status
  }

  function setCheckingtatus(status: boolean) {
    checkingStatus.value = status
  }

  return {
    apiStatus,
    databaseStatus,
    checkingStatus,
    setApiStatus,
    setDatabaseStatus,
    setCheckingtatus
  }
})
