<template>
  <teleport to="body">
    <transition name="slide-up">
      <div v-if="open" class="sheet-overlay" @click.self="$emit('close')">
        <div class="bottom-sheet">
          <div class="handle"></div>
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 70;
  display: flex;
  align-items: flex-end;
}

.handle {
  width: 48px;
  height: 4px;
  background: var(--surface-line);
  border-radius: 999px;
  margin: 0 auto 12px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(40px);
}
</style>

<style>
/* 非scoped样式，扩展全局.bottom-sheet */
.bottom-sheet {
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
