<template>
  <view class="handler-container">
    <!-- 核销员信息卡片 -->
    <view class="handler-card">
      <view class="handler-header">
        <text class="handler-name">{{ handlerName }}</text>
        <text class="handler-phone">{{ handlerPhone }}</text>
      </view>
      <view class="merchant-info">
        <text class="merchant-name">{{ merchantName }}</text>
        <text class="merchant-category">{{ merchantCategory }}</text>
      </view>
    </view>

    <!-- 统计数据 -->
    <view class="stats-container">
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalRedemptions }}</text>
        <text class="stat-label">总核销数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.todayRedemptions }}</text>
        <text class="stat-label">今日核销</text>
      </view>
    </view>

    <!-- 功能按钮 -->
    <view class="actions-container">
      <button class="action-btn primary" @click="goScan">
        扫码核销
      </button>
      <button class="action-btn" @click="goRecords">
        查看记录
      </button>
    </view>

    <!-- 最近核销记录 -->
    <view v-show="hasRecentOrders" class="recent-container">
      <text class="recent-title">最近核销记录</text>
      <view class="recent-list">
        <view v-for="order in recentOrders" :key="order.id" class="recent-item">
          <text class="order-id">{{ order.orderNo }}</text>
          <text class="order-time">{{ order.redeemedAt }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const handlerInfo = ref<any>(null);
const stats = ref({
  totalRedemptions: 0,
  todayRedemptions: 0,
});
const recentOrders = ref<any[]>([]);

// 计算属性 - 安全访问数据
const handlerName = computed(() => {
  if (handlerInfo.value && handlerInfo.value.name) {
    return handlerInfo.value.name;
  }
  return '核销员';
});

const handlerPhone = computed(() => {
  if (handlerInfo.value && handlerInfo.value.phone) {
    return handlerInfo.value.phone;
  }
  return '';
});

const merchantName = computed(() => {
  if (handlerInfo.value && handlerInfo.value.merchantName) {
    return handlerInfo.value.merchantName;
  }
  return '商户';
});

const merchantCategory = computed(() => {
  if (handlerInfo.value && handlerInfo.value.merchantCategory) {
    return handlerInfo.value.merchantCategory;
  }
  return '';
});

const hasRecentOrders = computed(() => {
  return recentOrders.value && recentOrders.value.length > 0;
});

onMounted(async () => {
  // 从本地存储获取核销员信息
  handlerInfo.value = uni.getStorageSync('handlerInfo');

  if (!handlerInfo.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.reLaunch({ url: '/pages/login' });
    return;
  }

  // TODO: 调用后端 API 获取统计数据和最近记录
  // 这里可以添加实际的 API 调用
});

const goScan = () => {
  uni.navigateTo({ url: '/pages/scan/index' });
};

const goRecords = () => {
  uni.navigateTo({ url: '/pages/handler/records' });
};
</script>

<style scoped>
.handler-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.handler-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  color: #ffffff;
}

.handler-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.handler-name {
  font-size: 36rpx;
  font-weight: bold;
}

.handler-phone {
  font-size: 28rpx;
}

.merchant-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.merchant-name {
  font-size: 32rpx;
  font-weight: 500;
}

.merchant-category {
  font-size: 24rpx;
  opacity: 0.9;
}

.stats-container {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stat-item {
  flex: 1;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666666;
}

.actions-container {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  background: #ffffff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.recent-container {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.recent-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
  color: #333333;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.recent-item:last-child {
  border-bottom: none;
}

.order-id {
  font-size: 28rpx;
  color: #333333;
}

.order-time {
  font-size: 24rpx;
  color: #999999;
}
</style>