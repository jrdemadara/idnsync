<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '@renderer/lib/axios'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@renderer/stores/authStore'
import { useStatusStore } from '@renderer/stores/statusStore'
import { useSyncStore } from '@renderer/stores/syncStore'
import { version } from '../../../../package.json'
import { Settings, Cloud, Database, Info, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const statusStore = useStatusStore()
const syncStore = useSyncStore()

function getCurrentRoute() {
  const route = useRoute()
  const currentRouteName = computed(() => route.name)
  const currentRoutePath = computed(() => route.path)
  return { currentRouteName, currentRoutePath }
}

const { currentRouteName } = getCurrentRoute()

const isSettingsRoute = computed(() => currentRouteName.value === 'settings')
const isHelpRoute = computed(() => currentRouteName.value === 'help')

const isChecking = ref(false)

async function checkNewData() {
  if (isChecking.value) return
  isChecking.value = true
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
  } catch (err) {
    console.error('Failed to fetch sync count:', err)
  } finally {
    isChecking.value = false
  }
}
</script>

<template>
  <div class="flex justify-between items-center w-screen h-fit mt-2 px-4 py-3">
    <div
      class="flex justify-center items-center"
      @click="
        () => {
          if (!syncStore.isSyncing) router.push('/')
        }
      "
    >
      <img src="../assets/electron.svg" alt="logo" class="w-10 mr-2" />
      <div class="flex flex-col">
        <h4 class="font-medium mr-1">
          IDNSync
          <span class="font-extralight text-xs font-mono">{{ version }}</span>
        </h4>
        <p class="text-xs -mt-1">Azitsorog Inc.</p>
      </div>
    </div>

    <div v-if="authStore.token" class="flex justify-center items-center space-x-4">
      <span v-if="statusStore.checkingStatus" class="loading loading-spinner text-success"></span>

      <div
        @click="
          () => {
            if (!syncStore.isSyncing) checkNewData()
          }
        "
        class="cursor-pointer hover:text-primary"
        :class="{
          'animate-spin': isChecking
        }"
      >
        <RefreshCw class="w-5 h-5" />
      </div>

      <div class="indicator">
        <span
          class="indicator-item status status-success"
          :class="{ 'status-success': statusStore.apiStatus, 'bg-error': !statusStore.apiStatus }"
        ></span>
        <Cloud />
      </div>

      <div class="indicator">
        <span
          class="indicator-item status status-success"
          :class="{
            'status-success': statusStore.databaseStatus,
            'bg-error': !statusStore.databaseStatus
          }"
        >
        </span>
        <Database />
      </div>

      <div
        @click="
          () => {
            if (!syncStore.isSyncing) router.push('/')
          }
        "
        class="hover:text-violet-600"
        :class="['cursor-pointer transition', isHelpRoute ? 'text-violet-600' : '']"
      >
        <Info class="w-5 h-5" />
      </div>

      <div
        @click="
          () => {
            if (!syncStore.isSyncing) router.push('/settings')
          }
        "
        class="hover:text-violet-600"
        :class="['cursor-pointer transition', isSettingsRoute ? 'text-violet-600' : '']"
      >
        <Settings class="w-5 h-5" />
      </div>
    </div>
  </div>
</template>
