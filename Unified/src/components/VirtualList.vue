<template>
  <div class="virtual-list-container" ref="container" @scroll="handleScroll">
    <div class="virtual-list-phantom" :style="{ height: totalHeight + 'px' }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offset}px)` }">
      <div
        v-for="item in visibleItems"
        :key="item[keyField]"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item._index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  itemHeight: {
    type: Number,
    required: true,
    default: 80
  },
  keyField: {
    type: String,
    default: 'id'
  },
  buffer: {
    type: Number,
    default: 5 // 缓冲区项目数
  }
});

const container = ref(null);
const scrollTop = ref(0);
const containerHeight = ref(0);

// 计算总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight;
});

// 计算可见区域的起始索引
const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer);
});

// 计算可见区域的结束索引
const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight);
  return Math.min(
    props.items.length,
    startIndex.value + visibleCount + props.buffer * 2
  );
});

// 计算偏移量
const offset = computed(() => {
  return startIndex.value * props.itemHeight;
});

// 计算可见项目
const visibleItems = computed(() => {
  return props.items
    .slice(startIndex.value, endIndex.value)
    .map((item, index) => ({
      ...item,
      _index: startIndex.value + index
    }));
});

// 处理滚动事件
const handleScroll = () => {
  if (container.value) {
    scrollTop.value = container.value.scrollTop;
  }
};

// 更新容器高度
const updateContainerHeight = () => {
  if (container.value) {
    containerHeight.value = container.value.clientHeight;
  }
};

// 滚动到指定索引
const scrollToIndex = (index) => {
  if (container.value) {
    const targetScrollTop = index * props.itemHeight;
    container.value.scrollTop = targetScrollTop;
  }
};

// 滚动到顶部
const scrollToTop = () => {
  scrollToIndex(0);
};

// 滚动到底部
const scrollToBottom = () => {
  scrollToIndex(props.items.length - 1);
};

// 监听窗口大小变化
let resizeObserver = null;

onMounted(() => {
  updateContainerHeight();
  
  // 使用 ResizeObserver 监听容器大小变化
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight();
    });
    
    if (container.value) {
      resizeObserver.observe(container.value);
    }
  } else {
    // 降级方案：使用 window resize 事件
    window.addEventListener('resize', updateContainerHeight);
  }
});

onUnmounted(() => {
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
    resizeObserver.disconnect();
  } else {
    window.removeEventListener('resize', updateContainerHeight);
  }
});

// 监听items变化，重置滚动位置
watch(() => props.items.length, () => {
  if (scrollTop.value > totalHeight.value) {
    scrollToTop();
  }
});

// 暴露方法给父组件
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom
});
</script>

<style scoped>
.virtual-list-container {
  height: 100%;
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-list-item {
  box-sizing: border-box;
}

/* 优化滚动性能 */
.virtual-list-container {
  will-change: scroll-position;
}

.virtual-list-content {
  will-change: transform;
}
</style>
