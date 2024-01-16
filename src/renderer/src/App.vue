<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Settings, HelpCircle } from 'lucide-vue-next'
//import { ipcRenderer } from 'electron'
const { ipcRenderer } = require('electron')
const dirname = ipcRenderer.sendSync('get-dirname')
const apiStatus = ref(0)
const section = ref('main')
const testing = ref(false)
const loading = ref(false)
const status = ref('Synchronize')
const message = ref('Click to synchronize data.')

const databaseConfig = ref({
  server: '',
  port: 0,
  user: '',
  password: '',
  database: '',
  options: {
    trustServerCertificate: true
  }
})

onMounted(() => {
  getLocalConnection()
})

const getLocalConnection = async () => {
  axios
    .get('https://node1.jrdemadara.dev/api/v1/uri/local_database', {
      headers: {
        authorization:
          'softspark@zgmEl=Z4Bqdm402RuNJg17RAP9kGKYq8SbrNNlRdnygJws!n5XE1Ob=mmElEQLUjYOEiYDUkPJtFHccFuaLrt9u6uCPIonOfrq/4MqojK!vOgIp4CSS8aj?0um7fH4jcWOCBWZFkn844WGuySOxY-Hkkj0P-AwXOi7pMjP!PJ3DBLUZi6LTtio/MY?BWbynV8HTPGAoLBqvzu0RC6TXGIFvzw?klBAw0d-dut6Ks3SNGKZtAqfSB1P'
      }
    })
    .then(function (response) {
      if (response.data) {
        apiStatus.value = 1
        databaseConfig.value.server = response.data.host
        databaseConfig.value.port = response.data.port
        databaseConfig.value.user = response.data.user
        databaseConfig.value.password = response.data.password
        databaseConfig.value.database = response.data.database
      } else {
        apiStatus.value = 0
      }
    })
    .catch(function () {
      apiStatus.value = 0
    })
    .finally(function () {
      // Send the database config to the main process
      ipcRenderer.send('set-database-config', JSON.stringify(databaseConfig), dirname)
    })
}

const syncData = async () => {
  if (!loading.value) {
    loading.value = true
    status.value = 'Checking'
    message.value = 'Checking for update...'

    await new Promise((resolve) => setTimeout(resolve, 5000))

    axios
      .get('https://node1.jrdemadara.dev/api/v1/uri/check_update', {
        headers: {
          authorization:
            'softspark@zgmEl=Z4Bqdm402RuNJg17RAP9kGKYq8SbrNNlRdnygJws!n5XE1Ob=mmElEQLUjYOEiYDUkPJtFHccFuaLrt9u6uCPIonOfrq/4MqojK!vOgIp4CSS8aj?0um7fH4jcWOCBWZFkn844WGuySOxY-Hkkj0P-AwXOi7pMjP!PJ3DBLUZi6LTtio/MY?BWbynV8HTPGAoLBqvzu0RC6TXGIFvzw?klBAw0d-dut6Ks3SNGKZtAqfSB1P'
        }
      })
      .then(function (response) {
        if (response.data.count > 0) {
          status.value = 'Synchronizing'
          message.value = `Synchronizing ${response.data.count} data...`
          //Save data to sql
          ipcRenderer.send('insert-data', JSON.stringify(response.data))
          ipcRenderer.on('insert-data-response', (event, result) => {
            if (result.success == true) {
              status.value = 'Completed'
              message.value = `Database is up to date.`
            } else {
              status.value = 'Resync'
              message.value = `Error migrating data.`
            }
          })
        } else {
          loading.value = false
          status.value = 'Resync'
          message.value = 'Database is up to date.'
          console.log(response.data)
        }
      })
      .catch(function (error) {
        console.log(error)
      })
      .finally(function () {})
  }
}
</script>

<template>
  <div class="flex flex-col w-screen h-screen bg-slate-950">
    <header class="flex justify-between w-screen h-fit p-4 bg-transparent">
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
          <p class="text-sm">Online</p>
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
            class="w-64 h-64 rounded-full shadow-inner border-8 hover:transition hover:duration-300 hover:ease-in-out text-2xl text-slate-50"
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
      <h2 class="text-primary font-bold uppercase">Connection Settings</h2>
      <div class="grid grid-cols-2 gap-4 gap-y-1 mt-6">
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Hostname</span>
          </div>
          <input type="text" placeholder="" class="input input-bordered w-full max-w-xs" />
        </label>
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Port</span>
          </div>
          <input type="text" placeholder="" class="input input-bordered w-full max-w-xs" />
        </label>
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Username</span>
          </div>
          <input type="text" placeholder="" class="input input-bordered w-full max-w-xs" />
        </label>
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Password</span>
          </div>
          <input type="text" placeholder="" class="input input-bordered w-full max-w-xs" />
        </label>
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Database/Schema</span>
          </div>
          <input type="text" placeholder="" class="input input-bordered w-full max-w-xs" />
        </label>
      </div>
      <div class="divider mt-6"></div>
      <div class="flex flex-row justify-between items-center mt-3">
        <div v-show="testing == true" class="flex flex-col justify-center items-center h-fit">
          <progress class="progress w-56"></progress>
          <p class="mt-2">Testing Connection...</p>
        </div>
        <div class="flex">
          <button class="btn btn-neutral mr-5" @click="getLocalConnection">Test Connection</button>
          <button class="btn btn-primary text-slate-50" @click="section = 'main'">
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
