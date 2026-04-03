<template>
  <view class="merchant-list-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">品牌商户</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 商户列表 -->
    <scroll-view v-else scroll-y class="merchant-scroll">
      <view class="merchant-grid">
        <view
          v-for="merchant in merchants"
          :key="merchant.id"
          class="merchant-card"
          @click="handleMerchantClick(merchant)"
        >
          <image
            :src="merchant.logo || getDefaultImage(merchant.id)"
            class="merchant-image"
            mode="aspectFill"
          />
          <view class="merchant-info">
            <text class="merchant-name">{{ merchant.name }}</text>
            <text class="merchant-desc">{{ merchant.description || merchant.category }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

const statusBarHeight = ref(0)
const loading = ref(false)
const merchants = ref<any[]>([])

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  loadMerchants()
})

async function loadMerchants() {
  try {
    loading.value = true
    const res = await merchantApi.getList({ limit: 50, status: 'ACTIVE' })
    if (res.success && res.data) {
      merchants.value = res.data
    }
  } catch (error) {
    console.error('加载商户失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleMerchantClick(merchant: any) {
  uni.navigateTo({
    url: `/pages/merchant/detail?id=${merchant.id}`
  })
}

function getDefaultImage(id: string) {
  return `https://picsum.photos/seed/merchant-${id}/400/300`
}
</script>

<style lang="scss" scoped>
.merchant-list-page {
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

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6e7881;
}

.merchant-scroll {
  margin-top: 120rpx;
  height: calc(100vh - 120rpx - 120rpx);
  padding: 24rpx;
}

.merchant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.merchant-card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.04);
  transition: transform 0.3s ease;
}

.merchant-card:active {
  transform: scale(0.98);
}

.merchant-image {
  width: 100%;
  height: 300rpx;
}

.merchant-info {
  padding: 20rpx;
}

.merchant-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #171c20;
  margin-bottom: 8rpx;
}

.merchant-desc {
  display: block;
  font-size: 24rpx;
  color: #6e7881;
}
</style>