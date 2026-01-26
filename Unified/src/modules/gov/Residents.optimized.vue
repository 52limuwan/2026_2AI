<template>
  <div class="residents-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <van-search
        v-model="keyword"
        placeholder="搜索居民姓名、电话、身份证"
        @search="handleSearch"
        @clear="handleClear"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ totalClients }}</div>
        <div class="stat-label">总居民数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-danger">{{ highRiskCount }}</div>
        <div class="stat-label">高风险</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-warning">{{ todayWarnings }}</div>
        <div class="stat-label">今日预警</div>
      </div>
    </div>

    <!-- ✅ 使用虚拟滚动优化长列表 -->
    <div class="residents-list">
      <VirtualList
        ref="virtualList"
        :items="filteredClients"
        :item-height="100"
        key-field="id"
        :buffer="3"
      >
        <template #default="{ item }">
          <div class="resident-card" @click="viewDetail(item.id)">
            <div class="resident-header">
              <div class="resident-name">
                {{ item.name }}
                <van-tag v-if="item.risk_flags" type="danger" size="small">
                  高风险
                </van-tag>
              </div>
              <div class="resident-age">{{ item.age }}岁</div>
            </div>
            
            <div class="resident-info">
              <div class="info-item">
                <van-icon name="phone-o" />
                <span>{{ item.phone }}</span>
              </div>
              <div class="info-item">
                <van-icon name="location-o" />
                <span>{{ item.community_name || '未分配社区' }}</span>
              </div>
            </div>
            
            <div class="resident-stats">
              <span class="stat-item">
                <van-icon name="shopping-cart-o" />
                订单: {{ item.order_count || 0 }}
              </span>
              <span class="stat-item" v-if="item.last_order_time">
                <van-icon name="clock-o" />
                最近: {{ formatDate(item.last_order_time) }}
              </span>
            </div>
          </div>
        </template>
      </VirtualList>
    </div>

    <!-- 加载状态 -->
    <van-loading v-if="loading" class="loading-center" />
    
    <!-- 空状态 -->
    <van-empty
      v-if="!loading && filteredClients.length === 0"
      description="暂无居民数据"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import VirtualList from '@/components/VirtualList.vue';
import { getClients, getDashboard } from '@/api/gov';
import { debounce } from '@/utils/performance';

const router = useRouter();

// 数据
const clients = ref([]);
const keyword = ref('');
const loading = ref(false);
const virtualList = ref(null);

// 统计数据
const totalClients = ref(0);
const highRiskCount = ref(0);
const todayWarnings = ref(0);

// ✅ 优化：使用计算属性过滤，避免重复计算
const filteredClients = computed(() => {
  if (!keyword.value) {
    return clients.value;
  }
  
  const kw = keyword.value.toLowerCase();
  return clients.value.filter(client => 
    client.name?.toLowerCase().includes(kw) ||
    client.phone?.includes(kw) ||
    client.id_card?.includes(kw)
  );
});

// ✅ 优化：使用防抖减少搜索请求
const handleSearch = debounce(async () => {
  if (!keyword.value) {
    return;
  }
  
  loading.value = true;
  try {
    const res = await getClients({ keyword: keyword.value });
    if (res.code === 0) {
      clients.value = res.data.clients;
      
      // 滚动到顶部
      if (virtualList.value) {
        virtualList.value.scrollToTop();
      }
    }
  } catch (error) {
    showToast('搜索失败');
  } finally {
    loading.value = false;
  }
}, 300);

// 清除搜索
const handleClear = () => {
  keyword.value = '';
  loadClients();
};

// 加载居民列表
const loadClients = async () => {
  loading.value = true;
  try {
    const res = await getClients();
    if (res.code === 0) {
      clients.value = res.data.clients;
    }
  } catch (error) {
    showToast('加载失败');
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadDashboard = async () => {
  try {
    const res = await getDashboard();
    if (res.code === 0) {
      const { summary } = res.data.dashboard;
      totalClients.value = summary.totalClients;
      highRiskCount.value = summary.highRisk;
      todayWarnings.value = summary.todayWarnings;
    }
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
};

// 查看详情
const viewDetail = (clientId) => {
  router.push(`/gov/clients/${clientId}`);
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 小于1天显示相对时间
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  }
  
  // 否则显示日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
};

onMounted(() => {
  loadClients();
  loadDashboard();
});
</script>

<style scoped>
.residents-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.search-bar {
  background: white;
  padding: 8px 0;
}

.stats-cards {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  margin-bottom: 8px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1989fa;
}

.stat-value.text-danger {
  color: #ee0a24;
}

.stat-value.text-warning {
  color: #ff976a;
}

.stat-label {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}

.residents-list {
  flex: 1;
  overflow: hidden;
  background: white;
}

.resident-card {
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
  cursor: pointer;
  transition: background 0.2s;
}

.resident-card:active {
  background: #f7f8fa;
}

.resident-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.resident-name {
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.resident-age {
  font-size: 14px;
  color: #969799;
}

.resident-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #646566;
}

.resident-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #969799;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
