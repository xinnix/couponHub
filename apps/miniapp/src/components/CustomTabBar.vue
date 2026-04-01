<script setup lang="ts">
interface TabItem {
  pagePath: string
  text: string
  icon: string
}

const props = defineProps<{
  current: number
}>()

const tabs: TabItem[] = [
  {
    pagePath: '/pages/index',
    text: '首页',
    icon: '🏠',
  },
  {
    pagePath: '/pages/home/index',
    text: '优惠',
    icon: '🏷️',
  },
  {
    pagePath: '/pages/wallet/index',
    text: '订单',
    icon: '📋',
  },
  {
    pagePath: '/pages/scan/index',
    text: '我的',
    icon: '👤',
  },
]

function switchTab(index: number, path: string) {
  if (props.current === index)
    return

  uni.switchTab({ url: path })
}
</script>

<template>
  <view class="tab-bar">
    <view
      v-for="(tab, index) in tabs"
      :key="index"
      :class="['tab-item', { active: current === index }]"
      @click="switchTab(index, tab.pagePath)"
    >
      <text class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-text">{{ tab.text }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 50;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 12px 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 32px rgba(23, 28, 32, 0.04);

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 12px;
    color: #94a3b8;

    &.active {
      color: #00AEEF;
      background: rgba(239, 244, 250, 0.8);
    }

    .tab-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .tab-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }
  }
}
</style>
