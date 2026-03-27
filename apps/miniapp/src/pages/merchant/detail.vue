<script setup lang="ts">
import { ref } from 'vue'
import { merchantApi, couponApi } from '@/api/business'

const loading = ref(true)
const merchant = ref<any>(null)
const couponList = ref<any[]>([])
const statusBarHeight = ref(0)

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  const merchantId = options?.id
  if (merchantId) {
    await loadMerchant(merchantId)
  }
  else {
    loading.value = false
  }
})

async function loadMerchant(id: string) {
  try {
    loading.value = true
    const res = await merchantApi.getDetail(id)
    merchant.value = res.data
    await loadCoupons(id)
  }
  catch (error) {
    console.error('加载商户失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function loadCoupons(merchantId: string) {
  try {
    const res = await couponApi.getList({ merchantId, limit: 20, status: 'ACTIVE' })
    couponList.value = Array.isArray(res.data) ? res.data : []
  }
  catch {
    couponList.value = []
  }
}

function handleCouponClick(item: any) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${item.id}`,
  })
}
</script>

<template>
  <view class="container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="nav-title">商户详情</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="!merchant" class="empty">
      <text>商户不存在</text>
    </view>

    <view v-else class="merchant-detail">
      <!-- 商户信息 -->
      <view class="info-section">
        <text class="name">
          {{ merchant.name }}
        </text>
        <text class="category">
          {{ merchant.category }}
        </text>
        <text class="floor">
          {{ merchant.floor }}
        </text>
        <text class="phone">
          {{ merchant.phone }}
        </text>
        <text class="description">
          {{ merchant.description }}
        </text>
      </view>

      <!-- 可用优惠券 -->
      <view class="section">
        <text class="section-title">
          可用优惠券
        </text>
        <view v-if="couponList.length === 0" class="empty">
          <text>暂无可用优惠券</text>
        </view>
        <view v-else class="coupon-list">
          <view v-for="item in couponList" :key="item.id" class="coupon-item" @click="handleCouponClick(item)">
            <text class="coupon-title">
              {{ item.title }}
            </text>
            <text class="coupon-price">
              ¥{{ item.buyPrice }} 购 ¥{{ item.faceValue }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.container {
  padding: 0;
}

/* 自定义导航栏 */
.nav-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 20rpx;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #ffffff;
  line-height: 1;
  margin-right: 8rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.nav-placeholder {
  width: 64rpx;
}

.merchant-detail {
  padding: 20rpx;
}

.info-section {
  padding: 30rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.category,
.floor,
.phone {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.description {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-top: 20rpx;
}

.section {
  margin-top: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
}

.coupon-item {
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.coupon-title {
  display: block;
  font-size: 28rpx;
  margin-bottom: 10rpx;
}

.coupon-price {
  font-size: 24rpx;
  color: #ff6b6b;
}
</style>
