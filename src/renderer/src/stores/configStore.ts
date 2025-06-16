import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
  const host = ref(localStorage.getItem('config_host') || '')
  const port = ref(localStorage.getItem('config_port') || 3306)
  const user = ref(localStorage.getItem('config_user') || '')
  const password = ref(localStorage.getItem('config_password') || '')
  const database = ref(localStorage.getItem('config_database') || '')

  const photoDirectory = ref(
    localStorage.getItem('config_photo_directory') || '/Documents/azitsorog/profiles'
  )
  const signatureDirectory = ref(
    localStorage.getItem('config_signature_directory') || '/Documents/azitsorog/signatures'
  )

  const maxSyncSize = ref(Number(localStorage.getItem('config_max_sync_size') || 10))
  const fileWriteTrottle = ref(Number(localStorage.getItem('config_file_write_trottle') || 30))

  // Watch and persist each value
  watch(host, (val) => localStorage.setItem('config_host', val))
  watch(port, (val) => localStorage.setItem('config_port', val.toString()))
  watch(user, (val) => localStorage.setItem('config_user', val))
  watch(password, (val) => localStorage.setItem('config_password', val))
  watch(database, (val) => localStorage.setItem('config_database', val))
  watch(photoDirectory, (val) => localStorage.setItem('config_photo_directory', val))
  watch(signatureDirectory, (val) => localStorage.setItem('config_signature_directory', val))
  watch(maxSyncSize, (val) => localStorage.setItem('config_max_sync_size', val.toString()))
  watch(fileWriteTrottle, (val) =>
    localStorage.setItem('config_file_write_trottle', val.toString())
  )

  const getConfig = computed(() => ({
    host: host.value,
    port: Number(port.value),
    user: user.value,
    password: password.value,
    database: database.value,
    photoDirectory: photoDirectory.value,
    signatureDirectory: signatureDirectory.value,
    maxSyncSize: maxSyncSize.value,
    fileWriteTrottle: fileWriteTrottle.value
  }))

  function clearConfig() {
    host.value = ''
    port.value = 3306
    user.value = ''
    password.value = ''
    database.value = ''
    photoDirectory.value = ''
    signatureDirectory.value = ''
    maxSyncSize.value = 10
    fileWriteTrottle.value = 30
  }

  return {
    host,
    port,
    user,
    password,
    database,
    photoDirectory,
    signatureDirectory,
    maxSyncSize,
    fileWriteTrottle,
    getConfig,
    clearConfig
  }
})
