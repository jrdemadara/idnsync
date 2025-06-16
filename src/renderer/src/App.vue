<script setup lang="ts">
import { onMounted } from 'vue'
import { startupCheck } from '@renderer/helpers/startupCheck'

onMounted(() => {
  startupCheck()
})
</script>

<template>
  <RouterView />
</template>
