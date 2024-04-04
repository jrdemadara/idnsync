<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import oauth from 'axios-oauth-client'
import { Settings, HelpCircle } from 'lucide-vue-next'
import { version } from '../../../package.json'
import backgroundImage from './assets/wavylines.svg'
// Get the dirname synchronously
const dirname = window.electron.ipcRenderer.sendSync('get-dirname')

// Initialize reactive variables using ref
const server = ref('')
const port = ref('')
const user = ref('')
const password = ref('')
const database = ref('')

const photo_directory = ref('')
const signature_directory = ref('')

const endpoint = ref('')
const clientID = ref('')
const clientSecret = ref('')

const apiStatus = ref(0)
const databaseStatus = ref(0)
const section = ref('main')
const testing = ref(false)
const loading = ref(false)
const status = ref('Synchronize')
const message = ref('Click to synchronize data.')
const databaseConnectionStatus = ref('x')

const accessToken = ref('0')
const pageCount = ref(0)
const currentPage = ref(1)
const totalItems = ref(0)
const data = ref([])

const defaultStatus = () => {
  testing.value = false
  loading.value = false
  status.value = 'Synchronize'
  message.value = 'Click to synchronize data.'
}

const databaseConfig = ref({
  server: localStorage.getItem('server'),
  port: 1433,
  user: localStorage.getItem('user'),
  password: localStorage.getItem('password'),
  database: localStorage.getItem('database'),
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
})

const apiConfig = ref({
  endpoint: localStorage.getItem('endpoint'),
  clientID: localStorage.getItem('client_id'),
  clientSecret: localStorage.getItem('client_secret')
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

const loadApiToUI = async () => {
  endpoint.value = apiConfig.value.endpoint
  clientID.value = apiConfig.value.clientID
  clientSecret.value = apiConfig.value.clientSecret
}

const updateConfig = async () => {
  // database settings storage
  localStorage.setItem('server', server.value)
  localStorage.setItem('port', port.value)
  localStorage.setItem('user', user.value)
  localStorage.setItem('password', password.value)
  localStorage.setItem('database', database.value)
  // directory settings storage
  localStorage.setItem('photo_directory', photo_directory.value)
  localStorage.setItem('signature_directory', signature_directory.value)
  // api setttings storage
  localStorage.setItem(
    'endpoint',
    endpoint.value.endsWith('/') ? endpoint.value.slice(0, -1) : endpoint.value
  )
  localStorage.setItem('client_id', clientID.value)
  localStorage.setItem('client_secret', clientSecret.value)

  section.value = 'main'
}

const authenticate = async () => {
  const getClientCredentials = oauth.clientCredentials(
    axios.create(),
    `${apiConfig.value.endpoint}/oauth`,
    apiConfig.value.clientID,
    apiConfig.value.clientSecret
  )

  try {
    const auth = await getClientCredentials('printer', 'client_credentials')
    accessToken.value = auth.access_token
    if (auth.access_token) {
      apiStatus.value = 1
    } else {
      apiStatus.value = 0
    }
  } catch (e) {
    apiStatus.value = 0
  }
}

const checkLocalDatabase = async () => {
  localStorage.setItem('server', server.value)
  localStorage.setItem('port', port.value)
  localStorage.setItem('user', user.value)
  localStorage.setItem('password', password.value)
  localStorage.setItem('database', database.value)

  localStorage.setItem('photo_directory', photo_directory.value)
  localStorage.setItem('signature_directory', signature_directory.value)

  localStorage.setItem('endpoint', endpoint.value)
  localStorage.setItem('client_id', clientID.value)
  localStorage.setItem('client_secret', clientSecret.value)

  databaseConfig.value.server = localStorage.getItem('server')
  databaseConfig.value.port = localStorage.getItem('port')
  databaseConfig.value.user = localStorage.getItem('user')
  databaseConfig.value.password = localStorage.getItem('password')
  databaseConfig.value.database = localStorage.getItem('database')

  apiConfig.value.endpoint = localStorage.getItem('endpoint')
  apiConfig.value.clientID = localStorage.getItem('client_id')
  apiConfig.value.clientSecret = localStorage.getItem('client_secret')

  const config = JSON.stringify(databaseConfig.value)
  testing.value = true

  await new Promise((resolve) => setTimeout(resolve, 3000))
  authenticate()
  window.electron.ipcRenderer.send('check-database-connection', config, dirname)
  window.electron.ipcRenderer.on('check_database-response', (event, result) => {
    if (result.success) {
      databaseStatus.value = 1
      testing.value = false
      databaseConnectionStatus.value = 1
    } else {
      databaseStatus.value = 0
      testing.value = false
      databaseConnectionStatus.value = 0
    }
  })
}

const connectLocalDatabase = async () => {
  const config = JSON.stringify(databaseConfig.value)
  window.electron.ipcRenderer.send('set-database-config', config, dirname)
  window.electron.ipcRenderer.on('connect-local-response', (event, result) => {
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
  window.electron.ipcRenderer.send('set-directory-config', configJson, dirname)
}

const fetchPageCount = async () => {
  try {
    const response = await axios.get(`${endpoint.value}/id-data?page=${currentPage.value}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (response.status == 200) {
      pageCount.value = response.data.page_count
      totalItems.value = response.data.total_items
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

const saveToDatabase = async () => {
  data.value.forEach((element) => {
    const mockData = 1 //Replace with actual api data value length
    if (mockData > 0) {
      status.value = 'Synchronizing'
      message.value = `Synchronizing ${totalItems.value.length} new data...`
      window.electron.ipcRenderer.send('insert-data', JSON.stringify(element))
      window.electron.ipcRenderer.on('insert-data-response', (event, result) => {
        if (result.success) {
          status.value = 'Completed'
          message.value = 'Database is up to date.'
          pageCount.value = 0
          currentPage.value = 1
          totalItems.value = 0
          setTimeout(function () {
            defaultStatus()
          }, 10000)
        } else {
          status.value = 'Resync'
          message.value = 'Error migrating data.'
          pageCount.value = 0
          currentPage.value = 1
          totalItems.value = 0
          setTimeout(function () {
            defaultStatus()
          }, 10000)
        }
      })
    } else {
      console.log('data 0')
      loading.value = false
      status.value = 'Resync'
      message.value = 'Database is up to date.'
      pageCount.value = 0
      currentPage.value = 1
      totalItems.value = 0
      setTimeout(function () {
        defaultStatus()
      }, 10000)
    }
  })
}

const syncData = async () => {
  if (!loading.value) {
    loading.value = true
    status.value = 'Checking'
    message.value = 'Checking for update...'

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000))

      if (apiStatus.value === 1) {
        const hasPageCount = await fetchPageCount()
        if (hasPageCount) {
          status.value = 'Synchronizing'
          message.value = `Synchronizing ${totalItems.value} data. Please wait...`

          const pageRequests = Array.from({ length: pageCount.value }, (_, index) => {
            const page = index + 1
            return axios.get(`${endpoint.value}/id-data?page=${page}`, {
              headers: { Authorization: `Bearer ${accessToken.value}` }
            })
          })

          const responses = await Promise.all(pageRequests)

          responses.forEach((response) => {
            const person = response.data._embedded.id_data
            data.value.push(person)
          })

          saveToDatabase()
        }
      }
    } catch (error) {
      status.value = 'Resync'
      message.value = 'Error migrating data.'
    }
  }
}

onMounted(() => {
  authenticate()
  loadDatabaseToUI()
  loadApiToUI()
  loadDirectory()
  connectLocalDatabase()
})

// IPC Sample
const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <div
    class="bg-background flex flex-col w-screen h-screen bg-cover bg-center bg-no-repeat bg-slate-950"
  >
    <header class="flex justify-between w-screen h-fit mt-2 px-2 bg-transparent">
      <div class="flex justify-center items-center">
        <img src="./assets/electron.svg" alt="logo" class="w-10 mr-2" />
        <h4 class="font-bold text-slate-50 mr-1">
          IDNSync
          <span class="font-extralight text-xs font-mono">{{ version }}</span>
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
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
                  <span class="label-text"
                    >Photo Directory<small class="text-orange-500"
                      >(w/o trailing slash)</small
                    ></span
                  >
                </div>
                <input
                  v-model="photo_directory"
                  type="text"
                  placeholder="e.g., /Documents/IDnow/Photo"
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text"
                    >Signature Directory<small class="text-orange-500"
                      >(w/o trailing slash)</small
                    ></span
                  >
                </div>
                <input
                  v-model="signature_directory"
                  type="text"
                  placeholder="e.g., /Documents/IDnow/Signature"
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
                />
              </label>
            </div>
          </div>
        </div>
        <div class="collapse collapse-arrow join-item border border-base-300">
          <input type="radio" name="my-accordion-4" />
          <div class="collapse-title text-base font-medium">API Settings</div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 gap-4 gap-y-1">
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text"
                    >Endpoint <small class="text-orange-500">(w/o trailing slash)</small></span
                  >
                </div>
                <input
                  v-model="endpoint"
                  type="text"
                  placeholder="e.g., https://yourdomain.com"
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Client ID</span>
                </div>
                <input
                  v-model="clientID"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
                />
              </label>
              <label class="form-control w-full max-w-xs">
                <div class="label">
                  <span class="label-text">Client Secret</span>
                </div>
                <input
                  v-model="clientSecret"
                  type="text"
                  placeholder=""
                  class="input input-sm input-bordered w-full max-w-xs bg-slate-800"
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
            class="flex flex-col justify-start items-center h-fit"
          >
            <p class="mt-2 text-green-600 text-start">Database Connection Established</p>
          </div>
          <div
            v-show="connectionStatus == 0"
            class="flex flex-col justify-start items-center h-fit"
          >
            <p class="mt-2 text-red-600 text-start">Failed to connect to database</p>
          </div>
          <div v-show="apiStatus == 0" class="flex flex-col justify-start items-center h-fit">
            <p class="mt-2 text-red-600 text-start">Failed to connect to api</p>
          </div>
        </div>

        <div class="flex">
          <button class="btn btn-sm btn-neutral mr-5" @click="checkLocalDatabase">
            Test Connection
          </button>
          <button class="btn btn-sm btn-primary text-slate-50" @click="updateConfig">
            Save & Exit
          </button>
        </div>
      </div>
    </div>

    <div
      v-show="section == 'about'"
      class="flex flex-col justify-center items-center w-screen h-screen"
    >
      <img src="./assets/electron.svg" alt="logo" class="w-36" />
      <h2 class="text-xl">Built in <span class="text-cyan-200">Electron</span></h2>
      <h2 class="text-base">
        Powered by <span class="text-fuchsia-500">Vite</span> +
        <span class="text-green-600">Vue</span>
      </h2>
      <p class="text-indigo-600">https://jrdemadara.dev</p>
      <button class="btn btn-sm btn-primary text-slate-50 w-24 mt-10" @click="section = 'main'">
        Ok
      </button>
    </div>
  </div>
</template>
