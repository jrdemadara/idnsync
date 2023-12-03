<script setup>
import { ref } from 'vue'
import axios from 'axios'
// import logo from './assets/icons.svg'
import { Settings, HelpCircle } from 'lucide-vue-next'

const loading = ref(false)
const status = ref('Synchronize')
const message = ref('Click to synchronize data.')

const syncData = async () => {
  if (!loading.value) {
    loading.value = true
    status.value = 'Checking'
    message.value = 'Checking for update...'

    await new Promise((resolve) => setTimeout(resolve, 5000))

    axios
      .get('http://127.0.0.1:20230/api/v1/uri/check_update', {
        headers: {
          authorization:
            'softspark@zgmEl=Z4Bqdm402RuNJg17RAP9kGKYq8SbrNNlRdnygJws!n5XE1Ob=mmElEQLUjYOEiYDUkPJtFHccFuaLrt9u6uCPIonOfrq/4MqojK!vOgIp4CSS8aj?0um7fH4jcWOCBWZFkn844WGuySOxY-Hkkj0P-AwXOi7pMjP!PJ3DBLUZi6LTtio/MY?BWbynV8HTPGAoLBqvzu0RC6TXGIFvzw?klBAw0d-dut6Ks3SNGKZtAqfSB1P'
        }
      })
      .then(function (response) {
        if (response.data.count > 0) {
          status.value = 'Synchronizing'
          message.value = `Synchronizing ${response.data.count} data...`
          console.log(response.data.count)
          //Save data to sql
        } else {
          loading.value = false
          status.value = 'Resync'
          message.value = 'Database is up to date.'
          console.log(response.data.count)
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
      <div class="flex">
        <HelpCircle :size="24" :stroke-width="1" class="text-slate-50" />
        <Settings :size="24" :stroke-width="1" class="ml-3 text-slate-50" />
      </div>
    </header>
    <div class="flex flex-col justify-center items-center w-full h-full">
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
                status == 'Complete'
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
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
