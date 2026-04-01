<template>
  <view class="records-container">
    <view class="records-list">
      <view v-for="order in orders" :key="order.id" class="record-item">
        <view class="record-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <text class="order-status">{{ order.status }}</text>
        </view>
        <view class="record-body">
          <text class="coupon-name">{{ order.templateName }}</text>
          <text class="redeem-time">{{ order.redeemedAt }}</text>
        </view>
      </view>
    </view>

    <view v-show="isEmpty" class="empty-container">
      <text class="empty-text">暂无核销记录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const orders = ref<any[]>([]);
const isEmpty = computed(() => orders.value.length === 0);

onMounted(async () => {
  // TODO: 调用后端 API 获取核销记录
});
</script>

<style scoped>
.records-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.order-no {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.order-status {
  font-size: 24rpx;
  color: #52c41a;
  background: #f6ffed;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.coupon-name {
  font-size: 26rpx;
  color: #666666;
}

.redeem-time {
  font-size: 24rpx;
  color: #999999;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
