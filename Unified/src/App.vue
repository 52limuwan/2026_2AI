<template>
  <div :class="['app-shell', { 'elder-mode': ui.isElderMode }]">
    <router-view />
  </div>
</template>

<script setup>
import { useUiStore } from './stores/ui'

const ui = useUiStore()
</script>
