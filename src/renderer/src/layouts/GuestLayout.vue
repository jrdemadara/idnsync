<script setup lang="ts">
import Header from '@renderer/components/Header.vue'
</script>

<template>
  <div class="flex flex-col w-screen h-screen">
    <Header />
    <router-view />
  </div>
</template>
