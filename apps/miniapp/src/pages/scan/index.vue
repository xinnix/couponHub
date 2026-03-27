<template>
  <view class="container">
    <text class="title">扫码核销</text>

    <button class="scan-btn" @click="handleScan">开始扫码</button>

    <view v-if="result" class="result-box">
      <text class="result-title">核销结果</text>
      <text class="result-text">{{ result }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { redemptionApi } from '@/api/business';

const result = ref('');

async function handleScan() {
  try {
    const scanResult = await uni.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
    });

    if (scanResult.result) {
      await redeemOrder(scanResult.result);
    }
  } catch (error) {
    uni.showToast({
      title: '扫码失败',
      icon: 'none',
    });
  }
}

async function redeemOrder(code: string) {
  try {
    uni.showLoading({ title: '核销中...' });

    const res = await redemptionApi.redeem({ code });
    const orderNo = (res.data as any)?.orderNo;
    result.value = orderNo ? `核销成功（订单号：${orderNo}）` : '核销成功';

    uni.hideLoading();
    uni.showToast({
      title: '核销成功',
      icon: 'success',
    });
  } catch (error) {
    uni.hideLoading();
    result.value = '核销失败';
    uni.showToast({
      title: '核销失败',
      icon: 'none',
    });
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  text-align: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
  display: block;
}

.scan-btn {
  width: 80%;
  padding: 30rpx;
  background: #667eea;
  color: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin: 100rpx auto;
}

.result-box {
  margin-top: 40rpx;
  padding: 30rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.result-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.result-text {
  display: block;
  font-size: 32rpx;
  color: #07c160;
}
</style>
