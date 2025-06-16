<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, PlugZap2 } from 'lucide-vue-next'
import { toast } from 'vue3-toastify'
import { useConfigStore } from '@renderer/stores/configStore'
import { useStatusStore } from '@renderer/stores/statusStore'

const router = useRouter()
const configStore = useConfigStore()
const statusStore = useStatusStore()

const isConnectionTesting = ref(false)
const isDirectoryTesting = ref(false)

const testConnection = async () => {
  isConnectionTesting.value = true

  const result = await window.api.testDbConnection(configStore.getConfig)

  isConnectionTesting.value = false

  if (result.success) {
    statusStore.setDatabaseStatus(true)
    toast.success('Connected successfully!', {
      position: toast.POSITION.TOP_RIGHT
    })
  } else {
    statusStore.setDatabaseStatus(false)
    toast.error('Connection failed: ' + result.message, {
      position: toast.POSITION.TOP_RIGHT
    })
  }
}

async function testDirectory() {
  isDirectoryTesting.value = true

  const photoResult = await window.api.createDirectory(configStore.photoDirectory)
  const signatureResult = await window.api.createDirectory(configStore.signatureDirectory)

  if (photoResult.success && signatureResult.success) {
    statusStore.setCheckingtatus(false)
    toast.success('Directories validated and created if needed.', {
      position: toast.POSITION.TOP_RIGHT
    })
  } else {
    toast.error(`Directory error: ${photoResult.message || signatureResult.message}`, {
      position: toast.POSITION.TOP_RIGHT
    })
  }

  isDirectoryTesting.value = false
}
</script>

<template>
  <div class="flex flex-col w-screen h-screen px-5 mt-2">
    <div class="join join-vertical w-full">
      <div class="collapse collapse-arrow join-item border border-base-300">
        <input type="radio" name="my-accordion-2" checked="true" />
        <div class="collapse-title text-base font-medium">Database Config</div>
        <div class="collapse-content">
          <div class="grid grid-cols-2 gap-6">
            <label class="floating-label">
              <span>Hostname</span>
              <input
                v-model="configStore.host"
                type="text"
                placeholder="Hostname"
                class="input input-md w-full max-w-xs"
              />
            </label>
            <label class="floating-label">
              <span>Port</span>
              <input
                v-model="configStore.port"
                type="number"
                placeholder="Port"
                class="input w-full max-w-xs"
              />
            </label>
            <label class="floating-label">
              <span>User</span>
              <input
                v-model="configStore.user"
                type="text"
                placeholder="User"
                class="input w-full max-w-xs"
              />
            </label>
            <label class="floating-label">
              <span>Password</span>
              <input
                v-model="configStore.password"
                type="password"
                placeholder="Password"
                class="input w-full"
              />
            </label>
            <label class="floating-label">
              <span>Database</span>
              <input
                v-model="configStore.database"
                type="text"
                placeholder="Database"
                class="input w-full max-w-xs"
              />
            </label>
            <button @click="testConnection()" class="btn btn-warning">
              <div v-show="!isConnectionTesting"><PlugZap2 /></div>
              <div v-show="isConnectionTesting" class="loading loading-spinner"></div>
              Test Connection
            </button>
          </div>
        </div>
      </div>
      <div class="collapse collapse-arrow join-item border border-base-300">
        <input type="radio" name="my-accordion-2" />
        <div class="collapse-title text-base font-medium">File Directory</div>
        <div class="collapse-content">
          <div class="grid grid-cols-2 gap-4">
            <label class="floating-label">
              <span>Photo Directory</span>
              <input
                v-model="configStore.photoDirectory"
                type="text"
                placeholder="Photo Directory"
                class="input w-full"
              />
            </label>

            <label class="floating-label">
              <span>Signature Directory</span>
              <input
                v-model="configStore.signatureDirectory"
                type="text"
                placeholder="Signature Directory"
                class="input w-full"
              />
            </label>
            <button @click="testDirectory()" class="btn btn-warning">
              <div v-show="!isDirectoryTesting"><PlugZap2 /></div>
              <div v-show="isDirectoryTesting" class="loading loading-spinner"></div>
              Test Directory
            </button>
          </div>
        </div>
      </div>

      <div class="collapse collapse-arrow join-item border border-base-300">
        <input type="radio" name="my-accordion-2" />
        <div class="collapse-title text-base font-medium">Sync Settings</div>
        <div class="collapse-content">
          <div class="grid grid-cols-2 gap-4">
            <label class="floating-label">
              <span>Max Sync Size</span>
              <input
                v-model="configStore.maxSyncSize"
                type="number"
                placeholder="Max Sync Size"
                class="input w-full"
              />
            </label>

            <label class="floating-label">
              <span>File Write Trottle <small class="text-warning">milliseconds</small></span>
              <input
                v-model="configStore.fileWriteTrottle"
                type="number"
                placeholder="File Write Trottle"
                class="input w-full"
              />
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <button @click="router.push('/')" class="btn btn-primary self-end">
      <Check />
      Done
    </button>
  </div>
</template>
