import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSyncStore = defineStore('sync', () => {
  const isSyncing = ref(false)
  const pendingCount = ref(0)
  const syncedCount = ref(0)
  const totalCount = ref(0)
  const lastIdSynced = ref(0)

  function setPendingCount(count: number) {
    pendingCount.value = count
  }

  function setSyncedCount(count: number) {
    syncedCount.value = count
  }

  function setTotalCount(count: number) {
    totalCount.value = count
  }

  function setLastId(id: number) {
    lastIdSynced.value = id
  }

  function setIsSyncing(value: boolean) {
    isSyncing.value = value
  }

  function clearCounts() {
    pendingCount.value = 0
    syncedCount.value = 0
    totalCount.value = 0
  }

  return {
    isSyncing,
    pendingCount,
    syncedCount,
    totalCount,
    setPendingCount,
    setSyncedCount,
    setTotalCount,
    setIsSyncing,
    setLastId,
    clearCounts
  }
})
