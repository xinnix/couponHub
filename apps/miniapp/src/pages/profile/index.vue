<template>
  <view class="profile-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">我的</text>
      </view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-avatar">
        <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-image" />
        <view v-else class="avatar-placeholder">
          <text class="iconfont icon-yonghu" style="font-size: 48px; color: #00AEEF;"></text>
        </view>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.name || '未登录' }}</text>
        <text class="user-phone">{{ userInfo.phone || '点击登录' }}</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="handleMenuClick('wallet')">
        <view class="menu-left">
          <text class="iconfont menu-icon icon-qianbao"></text>
          <text class="menu-text">我的券包</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="handleMenuClick('orders')">
        <view class="menu-left">
          <text class="iconfont menu-icon icon-dingdan" style="color: #00AEEF;"></text>
          <text class="menu-text">我的订单</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="handleMenuClick('qrcode')">
        <view class="menu-left">
          <text class="iconfont menu-icon icon-erweima" style="color: #00AEEF;"></text>
          <text class="menu-text">我的二维码</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 核销员入口 -->
    <view v-if="isHandler" class="handler-section">
      <text class="section-title">核销员功能</text>
      <view class="menu-item" @click="handleMenuClick('scan')">
        <view class="menu-left">
          <text class="iconfont menu-icon icon-saoma" style="color: #00AEEF;"></text>
          <text class="menu-text">扫码核销</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('records')">
        <view class="menu-left">
          <text class="iconfont menu-icon icon-jilu" style="color: #00AEEF;"></text>
          <text class="menu-text">核销记录</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="3" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomTabBar from '@/components/CustomTabBar.vue'

const statusBarHeight = ref(0)
const isHandler = ref(false)
const userInfo = ref({
  name: '',
  phone: '',
  avatar: ''
})

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  // 获取用户信息
  const storedUserInfo = uni.getStorageSync('userInfo')
  if (storedUserInfo) {
    userInfo.value = storedUserInfo
  }

  // 检查是否是核销员
  isHandler.value = uni.getStorageSync('isHandler') || false
})

function handleMenuClick(type: string) {
  const routes: Record<string, string> = {
    wallet: '/pages/wallet/index',
    orders: '/pages/wallet/index',
    qrcode: '/pages/qrcode/index',
    scan: '/pages/scan/index',
    records: '/pages/handler/records'
  }

  const url = routes[type]
  if (url) {
    uni.navigateTo({ url })
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #f5faff;
  padding-bottom: 200rpx;
}

.nav-bar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 50;
  background: #ffffff;
  box-shadow: 0 2rpx 16rpx rgba(23, 28, 32, 0.04);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #171c20;
}

.user-card {
  margin: 120rpx 32rpx 32rpx;
  padding: 40rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.04);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(239, 244, 250, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #171c20;
  margin-bottom: 8rpx;
}

.user-phone {
  display: block;
  font-size: 24rpx;
  color: #6e7881;
}

.menu-section {
  margin: 0 32rpx 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.04);
}

.section-title {
  display: block;
  padding: 24rpx 32rpx 16rpx;
  font-size: 24rpx;
  font-weight: bold;
  color: #6e7881;
  letter-spacing: 2rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid rgba(189, 200, 209, 0.2);
  transition: background 0.3s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: rgba(239, 244, 250, 0.5);
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.menu-icon {
  font-size: 32px;
  color: #00AEEF;
}

.menu-text {
  font-size: 28rpx;
  color: #171c20;
}

.menu-arrow {
  font-size: 32rpx;
  color: #bdc8d1;
}

.handler-section {
  margin: 0 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.04);
}
</style>