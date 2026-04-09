<template>
  <view class="scan-container">
    <!-- 扫描提示 -->
    <view class="scan-tip" v-if="scanning">
      <text class="tip-text">正在启动摄像头...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { orderApi } from '@/api/business';

const scanning = ref(true);

// 权限验证并直接扫码
onMounted(async () => {
  const isHandler = uni.getStorageSync('isHandler');
  if (!isHandler) {
    uni.showModal({
      title: '权限不足',
      content: '您不是核销员，无法执行核销操作',
      showCancel: false,
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
    return;
  }

  // 直接调用摄像头扫描
  await handleScan();
});

async function handleScan() {
  scanning.value = true;

  try {
    const scanResult = await uni.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
    });

    scanning.value = false;

    if (scanResult[0]?.result) {
      // 获取订单信息
      await getOrderInfo(scanResult[0].result);
    } else {
      uni.showToast({
        title: '未识别到二维码',
        icon: 'none',
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  } catch (error: any) {
    scanning.value = false;

    // 用户取消扫码
    if (error.errMsg?.includes('cancel')) {
      uni.navigateBack();
    } else {
      uni.showToast({
        title: '扫码失败',
        icon: 'none',
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  }
}

async function getOrderInfo(code: string) {
  try {
    uni.showLoading({ title: '获取订单信息...', mask: true });

    const res = await orderApi.getByCode(code);
    const orderInfo = res.data as any;

    uni.hideLoading();

    // 保存订单信息到本地存储
    uni.setStorageSync('pendingRedemption', orderInfo);

    // 跳转到确认页面
    uni.navigateTo({
      url: `/pages/redemption/confirm`,
    });
  } catch (error: any) {
    uni.hideLoading();

    uni.showModal({
      title: '获取订单失败',
      content: error.message || '请检查二维码是否正确',
      showCancel: false,
      success: () => {
        // 返回上一页
        uni.navigateBack();
      },
    });
  }
}
</script>

<style scoped>
.scan-container {
  min-height: 100vh;
  background: #f5faff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', sans-serif;
}

.scan-tip {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip-text {
  font-size: 28rpx;
  color: #3e4850;
  font-weight: 500;
}
</style>
