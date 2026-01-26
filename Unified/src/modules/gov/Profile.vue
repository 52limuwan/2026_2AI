<template>
  <div class="card-list">
    <div class="card">
      <h3>个人中心</h3>
      <p class="muted">社区/政府账号信息</p>
      <div class="info">
        <div>
          <span class="muted small">姓名</span>
          <strong>{{ profile?.name || '未填写' }}</strong>
        </div>
        <div>
          <span class="muted small">电话</span>
          <strong>{{ profile?.phone || '未填写' }}</strong>
        </div>
        <div>
          <span class="muted small">账号 ID</span>
          <strong>{{ profile?.id || '-' }}</strong>
        </div>
        <div>
          <span class="muted small">角色</span>
          <strong>{{ roleText }}</strong>
        </div>
      </div>
    </div>
    
    <div class="card" v-if="communities.length > 0">
      <h3>管辖社区</h3>
      <p class="muted">您负责管理的社区列表</p>
      <div class="community-list">
        <div v-for="community in communities" :key="community.id" class="community-item">
          <div class="community-info">
            <strong>{{ community.name }}</strong>
            <p class="muted small">{{ community.region || '未设置区域' }}</p>
          </div>
          <span class="community-badge">{{ community.client_count || 0 }} 位用户</span>
        </div>
      </div>
    </div>
    
    <div class="card" v-else>
      <h3>管辖社区</h3>
      <p class="muted">超级管理员 - 可查看所有社区数据</p>
    </div>
    
    <div class="card">
      <h3>快速入口</h3>
      <div class="actions">
        <router-link to="/gov" class="ghost-btn">概览</router-link>
        <router-link to="/gov/summary" class="ghost-btn">数据</router-link>
        <router-link to="/gov/suggest" class="ghost-btn">重点建议</router-link>
        <router-link to="/gov/notifications" class="ghost-btn">通知</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { storeToRefs } from 'pinia'
import { getGovCommunities } from '../../api/gov'

const userStore = useUserStore()
const { profile } = storeToRefs(userStore)

const communities = ref([])

const roleText = computed(() => {
  if (profile.value?.role === 'gov') {
    return communities.value.length > 0 ? '社区管理员' : '超级管理员'
  }
  return profile.value?.role || 'gov'
})

onMounted(async () => {
  try {
    const res = await getGovCommunities()
    communities.value = res.data?.communities || []
  } catch (err) {
    console.error('获取社区列表失败:', err)
  }
})
</script>

<style scoped>
.info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.small {
  font-size: 13px;
}
.community-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.community-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--ghost-bg);
}
.community-info {
  flex: 1;
}
.community-info strong {
  display: block;
  margin-bottom: 4px;
}
.community-badge {
  padding: 6px 12px;
  border-radius: 12px;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-size: 13px;
  font-weight: var(--fw-medium);
  white-space: nowrap;
}
</style>
