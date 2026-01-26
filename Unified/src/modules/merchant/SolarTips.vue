<template>
  <div class="card-list">
    <div class="card">
      <div class="muted">24 节气建议</div>
      <h3>历史建议</h3>
      <div class="tip-card" v-for="tip in tips" :key="tip.id">
        <strong>{{ tip.term }}</strong>
        <p class="muted">{{ tip.tip }}</p>
        <p class="muted">{{ tip.actions }}</p>
      </div>
      <p v-if="!tips.length" class="muted">暂无建议</p>
    </div>

    <div class="card">
      <h3>新增节气建议</h3>
      <input v-model="form.term" placeholder="节气名称，如：小寒" class="input" />
      <textarea v-model="form.tip" placeholder="饮食建议（如：多喝热汤、少辣）" class="input textarea"></textarea>
      <textarea v-model="form.actions" placeholder="营销动作、上新计划" class="input textarea"></textarea>
      <button class="primary-btn" @click="save">保存</button>
      <p class="muted" v-if="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSolarTips, createSolarTip } from '../../api/merchant'

const tips = ref([])
const form = ref({
  term: '',
  tip: '',
  actions: ''
})
const message = ref('')

const load = async () => {
  tips.value = (await getSolarTips()).data.data.tips || []
}

onMounted(load)

const save = async () => {
  await createSolarTip(form.value)
  form.value = { term: '', tip: '', actions: '' }
  message.value = '已保存'
  load()
}
</script>

<style scoped>
.tip-card {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.textarea {
  min-height: 90px;
}
</style>
