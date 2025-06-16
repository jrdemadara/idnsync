<script lang="ts" setup>
import { ref, watch } from 'vue'
import api from '@renderer/lib/axios'
import { useAuthStore } from '@renderer/stores/authStore'
import { useSyncStore } from '@renderer/stores/syncStore'
import { useConfigStore } from '@renderer/stores/configStore'
import { useStatusStore } from '@renderer/stores/statusStore'
const authStore = useAuthStore()
const syncStore = useSyncStore()
const configStore = useConfigStore()
const statuStore = useStatusStore()

const status = ref('Initializing')
const isLoading = ref(false)
const message = ref('Not ready')

async function syncData() {
  let lastId = 0
  let hasMore = true

  if (isLoading.value) return
  isLoading.value = true
  syncStore.setIsSyncing(true)

  try {
    status.value = 'Checking'
    message.value = 'Checking previous sync...'

    const res = await window.api.getLastSyncedId(configStore.getConfig)

    if (res.success) {
      console.log('Last ID:', res.lastId)
      lastId = Number(res.lastId)
    } else {
      message.value = 'Error: Unable to get last synced ID.'
    }
  } catch (err) {
    console.error('Unexpected error while getting last ID:', err)
    message.value = 'Unexpected error occurred while syncing.'
    syncStore.setIsSyncing(false)
    return
  }

  try {
    status.value = 'Synchronizing'
    message.value = 'Starting sync...'

    while (hasMore) {
      // 1. Fetch from Laravel API
      const { data: response } = await api.get('/sync', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        params: { limit: configStore.maxSyncSize, last_id: lastId }
      })

      const records = response.data
      const nextCursor = response.next_cursor
      console.log(response)
      if (!records.length) {
        hasMore = false
        break
      }

      // 2. Sync to local DB via Electron
      const syncResult = await window.api.syncToDatabase(configStore.getConfig, records)
      if (!syncResult.success) {
        status.value = 'Error'
        message.value = 'Sync failed at local DB'
        throw new Error(syncResult.message || 'Sync failed at local DB')
      }

      // 3. Update `is_downloaded` on server
      const syncedIds = records.map((r) => r.id)
      await api.get('/mark-downloaded', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        params: { ids: syncedIds }
      })

      // 4. Move to next batch
      syncStore.setSyncedCount(syncStore.syncedCount + records.length)
      message.value = `Synced ${syncStore.syncedCount} records.`
      lastId = nextCursor
      hasMore = !!nextCursor
    }

    status.value = 'Completed'
    message.value = `Sync completed. Total: ${syncStore.syncedCount}`

    setTimeout(() => {
      status.value = 'Synchronize'
      message.value = 'Ready to synchronize.'
    }, 10000)
  } catch (err: any) {
    status.value = 'Resync'
    message.value = `Sync failed: ${err.message}`
  } finally {
    isLoading.value = false
    syncStore.setIsSyncing(false)
  }
}

watch(
  () => statuStore.checkingStatus,
  (newValue) => {
    if (!newValue) {
      status.value = 'Synchronize'
      message.value = 'Ready to synchronize.'
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col justify-center items-center w-full h-full">
    <div class="relative flex justify-center items-center w-64 h-64 rounded-full">
      <span
        class="absolute inline-flex w-48 h-48 rounded-full"
        :class="{
          'animate-ping': isLoading,
          'bg-orange-700': status == 'Checking',
          'bg-blue-700': status == 'Synchronizing'
        }"
      ></span>
      <div class="absolute">
        <button
          type="button"
          :disabled="status !== 'Synchronize' && status !== 'Resync'"
          :class="{
            'bg-gray-700 border-gray-500 hover:bg-gray-600 hover:border-gray-400':
              status == 'Initializing',
            'bg-violet-700 border-violet-500 hover:bg-violet-600 hover:border-violet-400':
              status == 'Synchronize',
            'bg-orange-700 border-orange-500': status == 'Checking',
            'bg-blue-700 border-blue-500': status == 'Synchronizing',
            'bg-rose-700 border-rose-500 hover:bg-rose-600 hover:border-rose-400':
              status == 'Resync',
            'bg-green-700 border-green-500 hover:bg-green-600 hover:border-green-400':
              status == 'Completed'
          }"
          class="w-64 h-64 rounded-full border-8 hover:transition hover:duration-300 hover:ease-in-out text-slate-50 flex flex-col justify-center items-center text-2xl"
          @click="syncData()"
        >
          <span>{{ status }}</span>
        </button>
      </div>
    </div>
    <transition name="fade" mode="out-in">
      <p
        v-if="!statuStore.checkingStatus"
        key="synced"
        class="text-sm mt-2 text-center text-gray-700 dark:text-gray-200"
      >
        Synced
        <span class="text-green-500 font-bold">{{ syncStore.syncedCount }}</span>
        out of
        <span class="font-bold">{{ syncStore.totalCount }}</span>
        record<span v-if="syncStore.totalCount !== 1">s</span>.<br />

        <!-- Show pending sync if any -->
        <span v-if="syncStore.totalCount - syncStore.syncedCount > 0" class="text-red-500">
          {{ syncStore.totalCount - syncStore.syncedCount }} pending sync.
        </span>
      </p>

      <small v-else key="initializing" class="text-success mt-2 animate-pulse"
        >Initializing...</small
      >
    </transition>
    <p
      class="text-xl mt-2 text-gray-800 dark:text-gray-200"
      :class="{
        'animate-pulse': message !== 'Ready to synchronize.'
      }"
    >
      {{ message }}
    </p>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
