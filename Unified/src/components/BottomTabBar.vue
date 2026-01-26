<template>
  <nav class="tabbar">
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ active: isActive(tab) }"
    >
      <span class="label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const props = defineProps({
  tabs: {
    type: Array,
    default: () => []
  }
})

const route = useRoute()

const isActive = (tab) => {
  const current = route.path || ''
  const mode = tab.mode || 'prefix'
  if (mode === 'exact') {
    return current === tab.to
  }
  return current === tab.to || current.startsWith(`${tab.to}/`)
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 12px calc(14px + var(--safe-bottom));
  background: var(--card);
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  z-index: 50;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 8px;
  color: var(--muted);
  min-height: 56px;
  font-size: calc(var(--fs-body) * var(--font-scale));
  font-weight: var(--fw-regular);
}

.tab.active {
  background: var(--surface-soft);
  color: var(--accent-strong);
  font-weight: var(--fw-semibold);
}

.label {
  line-height: 1.3;
}
</style>
