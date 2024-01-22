<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import oauth from 'axios-oauth-client'
import { Settings, HelpCircle } from 'lucide-vue-next'
//import configData from '@renderer/assets/config.json'

// Import ipcRenderer using require from Electron
const { ipcRenderer } = require('electron')

// Get the dirname synchronously
const dirname = ipcRenderer.sendSync('get-dirname')

// Initialize reactive variables using ref
const server = ref('')
const port = ref('')
const user = ref('')
const password = ref('')
const database = ref('')
const photo_directory = ref('')
const signature_directory = ref('')

const apiStatus = ref(0)
const databaseStatus = ref(0)
const section = ref('main')
const testing = ref(false)
const loading = ref(false)
const status = ref('Synchronize')
const message = ref('Click to synchronize data.')
const connectionStatus = ref('x')
const accessToken = ref('0')

const defaultStatus = () => {
  testing.value = false
  loading.value = false
  status.value = 'Synchronize'
  message.value = 'Click to synchronize data.'
}

const databaseConfig = ref({
  server: localStorage.getItem('server'),
  port: localStorage.getItem('port'),
  user: localStorage.getItem('user'),
  password: localStorage.getItem('password'),
  database: localStorage.getItem('database'),
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
})

const directoryConfig = ref({
  photo_directory: localStorage.getItem('photo_directory'),
  signature_directory: localStorage.getItem('signature_directory')
})

const loadDatabaseToUI = async () => {
  server.value = databaseConfig.value.server
  port.value = databaseConfig.value.port
  user.value = databaseConfig.value.user
  password.value = databaseConfig.value.password
  database.value = databaseConfig.value.database
}

const updateDatabaseConfig = async () => {
  localStorage.setItem('server', server.value)
  localStorage.setItem('port', port.value)
  localStorage.setItem('user', user.value)
  localStorage.setItem('password', password.value)
  localStorage.setItem('database', database.value)
  localStorage.setItem('photo_directory', photo_directory.value)
  localStorage.setItem('signature_directory', signature_directory.value)
}

const refreshDatabaseConfig = () => {
  databaseConfig.value.server = localStorage.getItem('server')
  databaseConfig.value.port = localStorage.getItem('port')
  databaseConfig.value.user = localStorage.getItem('user')
  databaseConfig.value.password = localStorage.getItem('password')
  databaseConfig.value.database = localStorage.getItem('database')
}

const authenticate = async () => {
  const getClientCredentials = oauth.clientCredentials(
    axios.create(),
    'https://testadmin.myibp.ph/oauth',
    'id_now',
    'w7EJ7BkT943ZtmXoHKlkhYRca0R4IcrO'
  )
  const auth = await getClientCredentials('printer', 'client_credentials')
  accessToken.value = auth.access_token
  if (auth.access_token) {
    apiStatus.value = 1
  }
}

const checkLocalDatabase = async () => {
  updateDatabaseConfig()
  databaseConfig.value.server = localStorage.getItem('server')
  databaseConfig.value.port = localStorage.getItem('port')
  databaseConfig.value.user = localStorage.getItem('user')
  databaseConfig.value.password = localStorage.getItem('password')
  databaseConfig.value.database = localStorage.getItem('database')
  const config = JSON.stringify(databaseConfig.value)
  testing.value = true
  console.log(config)
  await new Promise((resolve) => setTimeout(resolve, 3000))
  ipcRenderer.send('check-database-connection', config, dirname)
  ipcRenderer.on('check_database-response', (event, result) => {
    if (result.success) {
      databaseStatus.value = 1
      testing.value = false
      connectionStatus.value = 1
    } else {
      databaseStatus.value = 0
      testing.value = false
      connectionStatus.value = 0
    }
  })
}

const connectLocalDatabase = async () => {
  const config = JSON.stringify(databaseConfig.value)
  ipcRenderer.send('set-database-config', config, dirname)
  ipcRenderer.on('connect-local-response', (event, result) => {
    if (result.success) {
      databaseStatus.value = 1
    } else {
      status.value = 'Resync'
      message.value = 'Please check the local database connection.'
      databaseStatus.value = 0
    }
  })
}

const loadDirectory = async () => {
  const configJson = JSON.stringify(directoryConfig)
  photo_directory.value = localStorage.getItem('photo_directory')
  signature_directory.value = localStorage.getItem('signature_directory')
  ipcRenderer.send('set-directory-config', configJson, dirname)
}

const syncData = async () => {
  if (!loading.value) {
    loading.value = true
    status.value = 'Checking'
    message.value = 'Checking for update...'

    await new Promise((resolve) => setTimeout(resolve, 5000))

    if (apiStatus.value === 1) {
      try {
        const response = await axios.get('https://testadmin.myibp.ph/id-data?page=1', {
          headers: { Authorization: `Bearer ${accessToken.value}` }
        })

        const {
          _embedded: { id_data: newData }
        } = response.data

        if (newData.length > 0) {
          status.value = 'Synchronizing'
          message.value = `Synchronizing ${newData.length} new data...`

          ipcRenderer.send('insert-data', JSON.stringify(newData))

          ipcRenderer.on('insert-data-response', (event, result) => {
            if (result.success) {
              status.value = 'Completed'
              message.value = 'Database is up to date.'
              setTimeout(function () {
                defaultStatus()
              }, 10000)
            } else {
              status.value = 'Resync'
              message.value = 'Error migrating data.'
              setTimeout(function () {
                defaultStatus()
              }, 10000)
            }
          })
        } else {
          loading.value = false
          status.value = 'Resync'
          message.value = 'Database is up to date.'
          setTimeout(function () {
            defaultStatus()
          }, 10000)
        }
      } catch (error) {
        console.log(error)
      }
    }
  }
}

onMounted(() => {
  authenticate()
  loadDatabaseToUI()
  loadDirectory()
  connectLocalDatabase()
})
</script>

<template>
  <div class="flex flex-col w-screen h-screen bg-slate-950">
    <header class="flex justify-between w-screen h-fit mt-2 px-2 bg-transparent">
      <div class="flex justify-center items-center">
        <img src="./assets/icon.png" alt="logo" class="w-10 mr-2" />
        <h4 class="font-bold text-slate-50 mr-1">
          IDNSync <span class="font-light text-xs font-mono">v1.0</span>
        </h4>
      </div>
      <div class="flex justify-center items-center">
        <div class="flex justify-center items-center mr-4">
          <div
            class="animate-pulse w-3 h-3 rounded-badge mr-1"
            :class="{ 'bg-green-500': apiStatus == 1, 'bg-red-500': apiStatus == 0 }"
          ></div>
          <p class="text-sm">API Status</p>
        </div>

        <div class="flex justify-center items-center mr-4">
          <div
            class="animate-pulse w-3 h-3 rounded-badge mr-1"
            :class="{ 'bg-green-500': databaseStatus == 1, 'bg-red-500': databaseStatus == 0 }"
          ></div>
          <p class="text-sm">DB Status</p>
        </div>

        <HelpCircle :size="24" :stroke-width="1" class="text-slate-50" @click="section = 'about'" />
        <Settings
          :size="24"
          :stroke-width="1"
          class="ml-3 text-slate-50"
          @click="section = 'settings'"
        />
      </div>
    </header>
    <div v-show="section == 'main'" class="flex flex-col justify-center items-center w-full h-full">
      <div class="relative flex justify-center items-center w-64 h-64 rounded-full">
        <span
          class="absolute inline-flex w-48 h-48 rounded-full"
          :class="{
            'animate-ping': loading,
            'bg-orange-700': status == 'Checking',
            'bg-rose-700': status == 'Synchronizing'
          }"
        ></span>
        <div class="absolute">
          <button
            type="button"
            :class="{
              'bg-violet-700 border-violet-500 hover:bg-violet-600 hover:border-violet-400':
                status == 'Synchronize',
              'bg-orange-700 border-orange-500': status == 'Checking',
              'bg-rose-700 border-rose-500': status == 'Synchronizing',
              'bg-blue-700 border-blue-500 hover:bg-blue-600 hover:border-blue-400':
                status == 'Resync',
              'bg-green-700 border-green-500 hover:bg-green-600 hover:border-green-400':
                status == 'Completed'
            }"
            class="w-64 h-64 rounded-full border-8 hover:transition hover:duration-300 hover:ease-in-out text-2xl text-slate-50"
            @click="syncData"
          >
            {{ status }}
          </button>
        </div>
      </div>
      <p
        class="text-xl text-slate-50 mt-5"
        :class="{
          'animate-pulse': message !== 'Click to synchronize data.'
        }"
      >
        {{ message }}
      </p>
    </div>

    <div v-show="section == 'settings'" class="flex flex-col w-screen h-screen px-5 mt-2">
      <div class="join join-vertical w-full">
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="my-accordion-4" checked="checked" />
          <div class="collapse-title text-base font-medium">Database Settings</div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 gap-4 gap-y-1">
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Hostname</span>
                </div>
                <input
                  v-model="server"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Port</span>
                </div>
                <input
                  v-model="port"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Username</span>
                </div>
                <input
                  v-model="user"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Password</span>
                </div>
                <input
                  v-model="password"
                  type="password"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Database</span>
                </div>
                <input
                  v-model="database"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
            </div>
          </div>
        </div>
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="my-accordion-4" />
          <div class="collapse-title text-base font-medium">Directory Settings</div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 gap-4 gap-y-1">
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Photo Directory</span>
                </div>
                <input
                  v-model="photo_directory"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Signature Directory</span>
                </div>
                <input
                  v-model="signature_directory"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="flex flex-row justify-between items-center">
        <div v-show="testing == true" class="flex flex-col justify-center items-center h-fit">
          <progress class="progress w-56"></progress>
          <p class="mt-2">Testing Connection...</p>
        </div>
        <div v-show="testing == false">
          <div
            v-show="connectionStatus == 1"
            class="flex flex-col justify-center items-center h-fit"
          >
            <p class="mt-2 text-green-600">Connection Established</p>
          </div>
          <div
            v-show="connectionStatus == 0"
            class="flex flex-col justify-center items-center h-fit"
          >
            <p class="mt-2 text-red-600">Failed to connect</p>
          </div>
        </div>

        <div class="flex">
          <button class="btn btn-sm btn-neutral mr-5" @click="checkLocalDatabase">
            Test Connection
          </button>
          <button class="btn btn-sm btn-primary text-slate-50" @click="updateDatabaseConfig">
            Save & Exit
          </button>
        </div>
      </div>
    </div>

    <div
      v-show="section == 'about'"
      class="flex flex-col justify-center items-center w-screen h-screen"
    >
      <img src="./assets/icon.png" alt="logo" class="w-36" />
      <h2 class="text-xl">Built in <span class="text-cyan-200">Electron</span></h2>
      <h2 class="text-base">
        Powered by <span class="text-fuchsia-500">Vite</span> +
        <span class="text-green-600">Vue</span>
      </h2>
      <p class="text-indigo-600">https://jrdemadara.dev</p>
    </div>
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
