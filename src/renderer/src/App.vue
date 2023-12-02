<script setup>
import axios from 'axios'

const syncData = async () => {
  axios
    .get('https://node1.jrdemadara.dev/api/v1/uri/pull_update', {
    })
    .then(function (response) {
      console.log(response)
    })
    .catch(function (error) {
      console.log(error)

    })
    .finally(function () {

    })
}
</script>

<template>
  <div class="flex flex-col justify-center items-center w-screen h-screen bg-slate-950">
    <div class="relative flex justify-center items-center w-64 h-64 rounded-full">
      <span class="animate-ping absolute inline-flex w-40 h-40 rounded-full bg-violet-700"></span>
      <div class="absolute">
        <button type="button"
          class="w-64 h-64 rounded-full shadow-inner border-8 border-violet-900 bg-violet-700 hover:bg-violet-600 hover:border-violet-800 hover:transition hover:duration-300 hover:ease-in-out active:bg-violet-700 text-3xl text-slate-50">
          Sync
        </button>
      </div>
    </div>
    <p class="text-xl text-slate-50 mt-5">Please wait...</p>
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
