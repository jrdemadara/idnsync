import { useStatusStore } from '@renderer/stores/statusStore'
import { useConfigStore } from '@renderer/stores/configStore'
import { useAuthStore } from '@renderer/stores/authStore'
import { useSyncStore } from '@renderer/stores/syncStore'
import api from '@renderer/lib/axios'
import router from '@renderer/router'

export async function startupCheck() {
  const statusStore = useStatusStore()
  const configStore = useConfigStore()
  const authStore = useAuthStore()
  const syncStore = useSyncStore()

  let apiSuccess = false
  let dbSuccess = false
  let syncSuccess = false

  // API Status Check
  try {
    const res = await api.get('/ping', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    apiSuccess = res.status === 200
    statusStore.setApiStatus(apiSuccess)
  } catch (err) {
    statusStore.setApiStatus(false)
    authStore.clearToken()
    router.push({ name: 'login' })
    return
  }

  // Database Check
  try {
    const result = await window.api.testDbConnection(configStore.getConfig)
    dbSuccess = result.success
    statusStore.setDatabaseStatus(dbSuccess)
  } catch (err) {
    statusStore.setDatabaseStatus(false)
    console.log(err)
  }

  // Sync Count Check
  if (apiSuccess) {
    try {
      const response = await api.get('/check', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      })

      const pendingCount = response.data?.pending_count ?? 0
      const totalCount = response.data?.total_count ?? 0
      const syncedCount = totalCount - pendingCount

      syncStore.setPendingCount(pendingCount)
      syncStore.setTotalCount(totalCount)
      syncStore.setSyncedCount(syncedCount)

      syncSuccess = true
    } catch (err) {
      console.error('Failed to fetch sync count:', err)
    }
  }

  // ✅ If all checks passed
  if (apiSuccess && dbSuccess && syncSuccess) {
    statusStore.setCheckingtatus(false)
  }
}
