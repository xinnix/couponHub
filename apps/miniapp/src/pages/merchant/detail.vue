<script setup lang="ts">
import { computed, ref } from 'vue'
import { couponApi, merchantApi } from '@/api/business'

const loading = ref(true)
const merchant = ref<any>(null)
const couponList = ref<any[]>([])
const statusBarHeight = ref(0)
const isFavorite = ref(false)
const currentImageIndex = ref(0)

// 计算属性 - 显示数据
const displayCoverImage = computed(() => {
  if (merchant.value && merchant.value.gallery) {
    try {
      const gallery = Array.isArray(merchant.value.gallery)
        ? merchant.value.gallery
        : JSON.parse(merchant.value.gallery)
      if (gallery.length > 0) {
        return gallery[0]
      }
    }
    catch (e) {
      console.error('解析 gallery 失败:', e)
    }
  }
  if (merchant.value && merchant.value.logo) {
    return merchant.value.logo
  }
  return '/static/merchant/list-bg.png'
})

const displayName = computed(() => {
  if (merchant.value && merchant.value.name) {
    return merchant.value.name
  }
  return '未知商户'
})

const displayCategory = computed(() => {
  if (merchant.value && merchant.value.category) {
    // 如果 category 是对象，取 name 字段
    if (typeof merchant.value.category === 'object') {
      return merchant.value.category.name || '其他'
    }
    // 如果 category 是字符串，直接返回
    return merchant.value.category
  }
  return '其他'
})

const displayFloor = computed(() => {
  if (merchant.value && merchant.value.floor) {
    return merchant.value.floor
  }
  return ''
})

const displayArea = computed(() => {
  if (merchant.value && merchant.value.area) {
    return merchant.value.area
  }
  return ''
})

const displayPhone = computed(() => {
  if (merchant.value && merchant.value.phone) {
    return merchant.value.phone
  }
  return ''
})

const displayDescription = computed(() => {
  if (merchant.value && merchant.value.description) {
    return merchant.value.description
  }
  return '暂无商户介绍'
})

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function toggleFavorite() {
  isFavorite.value = !isFavorite.value
  uni.showToast({
    title: isFavorite.value ? '已收藏' : '已取消收藏',
    icon: 'success',
  })
}

function shareMerchant() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })
}

function callMerchant() {
  if (displayPhone.value) {
    uni.makePhoneCall({
      phoneNumber: displayPhone.value,
      success: () => {
        console.log('拨打电话成功')
      },
      fail: () => {
        uni.showToast({
          title: '拨打失败',
          icon: 'none',
        })
      },
    })
  }
  else {
    uni.showToast({
      title: '暂无联系电话',
      icon: 'none',
    })
  }
}

function handleCouponClick(item: any) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${item.id}`,
  })
}

function formatCouponValue(item: any) {
  if (item.discountType === 'PERCENT') {
    return `${item.discountValue}`
  }
  else {
    return `${item.faceValue}`
  }
}

function formatCouponUnit(item: any) {
  if (item.discountType === 'PERCENT') {
    return '折'
  }
  else {
    return `元购${item.faceValue}元`
  }
}

function formatCouponValidity(item: any) {
  if (item.validFrom && item.validUntil) {
    const from = new Date(item.validFrom).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    const until = new Date(item.validUntil).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    return `${from}-${until}可用`
  }
  return '长期有效'
}

onLoad(async (options: any) => {
  console.log('商户详情页面 onLoad, options:', options)

  let merchantId = ''
  if (options && options.id) {
    merchantId = options.id
  }

  console.log('merchantId:', merchantId)

  if (merchantId) {
    await loadMerchant(merchantId)
  }
  else {
    console.log('没有 merchantId, 显示空状态')
    loading.value = false
  }
})

async function loadMerchant(id: string) {
  try {
    loading.value = true
    console.log('====== 开始加载商户 ======')
    console.log('商户 ID:', id)

    const res = await merchantApi.getDetail(id)
    console.log('====== API 返回结果 ======')
    console.log('完整响应:', JSON.stringify(res, null, 2))
    console.log('success:', res?.success)
    console.log('data:', res?.data)
    console.log('data 类型:', typeof res?.data)

    // 检查响应格式
    if (!res) {
      console.error('❌ API 返回 null 或 undefined')
      uni.showToast({ title: 'API 返回异常', icon: 'none' })
      return
    }

    if (!res.success) {
      console.error('❌ API 返回 success=false')
      uni.showToast({ title: res.message || '加载失败', icon: 'none' })
      return
    }

    if (!res.data) {
      console.error('❌ API 返回 data 为空')
      uni.showToast({ title: '商户不存在', icon: 'none' })
      return
    }

    // 设置商户数据
    merchant.value = res.data
    console.log('✅ 商户数据已设置:', merchant.value)
    console.log('商户名称:', merchant.value?.name)

    // 加载优惠券
    await loadCoupons(id)
  }
  catch (error) {
    console.error('====== 加载商户异常 ======')
    console.error('错误信息:', error)
    uni.showToast({ title: '加载商户失败', icon: 'none' })
  }
  finally {
    loading.value = false
    console.log('====== 加载完成 ======')
    console.log('loading:', loading.value)
    console.log('merchant:', merchant.value)
    console.log('merchant 是否为 null:', merchant.value === null)
  }
}

async function loadCoupons(merchantId: string) {
  try {
    const res = await couponApi.getList({ merchantId, limit: 20, status: 'ACTIVE' })
    if (Array.isArray(res.data)) {
      couponList.value = res.data
    }
    else {
      couponList.value = []
    }
  }
  catch {
    couponList.value = []
  }
}
</script>

<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="top-bar" :style="{ height: `${statusBarHeight + 48}px` }">
      <view class="top-bar-inner" :style="{ marginTop: `${statusBarHeight}px` }">
        <view class="back-btn" @click="goBack">
          <text class="iconfont icon-fanhui text-black" />
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!merchant" class="empty-state">
      <text>商户不存在</text>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else class="main-content" scroll-y>
      <!-- 全宽封面图片 -->
      <view class="hero-section">
        <image class="hero-image" :src="displayCoverImage" mode="aspectFill" />
        <view class="image-counter">
          <text>1/1</text>
        </view>
      </view>

      <!-- 商户信息卡片 -->
      <view class="merchant-card">
        <!-- 商户名称 -->
        <text class="merchant-name">
          {{ displayName }}
        </text>

        <!-- 分类标签 -->
        <view class="category-row">
          <text class="category-text">
            {{ displayCategory }}
          </text>
        </view>

        <!-- 优惠徽章 -->
        <!-- <view v-if="couponList.length > 0" class="offer-badges">
          <view v-for="(item, index) in couponList.slice(0, 2)" :key="index" class="badge">
            <text class="badge-text">
              {{ formatCouponValue(item) }}{{ formatCouponUnit(item) }}
            </text>
          </view>
        </view> -->

        <!-- 商户信息 -->
        <view class="business-info">
          <view class="info-row">
            <text class="info-label">
              营业时间
            </text>
            <text class="info-value">
              10:00-22:00
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              店铺位置
            </text>
            <text class="info-value">
              {{ displayFloor }} {{ displayArea }}
            </text>
          </view>
        </view>

        <!-- 电话按钮 -->
        <view class="call-btn" @click="callMerchant">
          <text class="call-icon">
            📞
          </text>
        </view>
      </view>

      <!-- 优惠券列表 -->
      <view class="coupons-section">
        <view class="section-header">
          <text class="section-title">
            优惠活动
          </text>
        </view>

        <view v-show="couponList.length === 0" class="empty-coupon">
          <text class="empty-text">
            暂无优惠活动
          </text>
        </view>

        <view v-show="couponList.length > 0" class="coupon-list">
          <view v-for="item in couponList" :key="item.id" class="coupon-card" @click="handleCouponClick(item)">
            <!-- 左侧金额 -->
            <view class="coupon-left">
              <text class="coupon-value">
                {{ formatCouponValue(item) }}
              </text>
              <text class="coupon-unit">
                {{ formatCouponUnit(item) }}
              </text>
            </view>

            <!-- 右侧信息 -->
            <view class="coupon-right">
              <text class="coupon-title">
                {{ item.title }}
              </text>
              <text class="coupon-desc">
                {{ formatCouponValidity(item) }} | 全场通用
              </text>
              <view class="coupon-price-row">
                <text class="coupon-price">
                  ¥{{ item.buyPrice }}
                </text>
                <text class="coupon-original-price">
                  ¥{{ item.faceValue }}
                </text>
              </view>
            </view>

            <!-- 购买按钮 -->
            <view class="buy-btn">
              <text class="buy-text">
                立即购买
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <!-- <view class="bottom-bar">
      <view class="action-item" @click="toggleFavorite">
        <text class="action-icon">
          {{ isFavorite ? '★' : '☆' }}
        </text>
        <text class="action-label">
          收藏
        </text>
      </view>
      <view class="divider" />
      <view class="action-item" @click="shareMerchant">
        <text class="action-icon">
          ↗
        </text>
        <text class="action-label">
          分享
        </text>
      </view>
    </view> -->
  </view>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

/* 顶部导航栏 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.top-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}

.back-btn,
.more-btn,
.favorite-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  font-size: 24px;
  color: #171c20;
  line-height: 1;
}

.top-bar-title {
  font-size: 16px;
  font-weight: bold;
  color: #171c20;
}

.top-bar-right {
  display: flex;
  gap: 12px;
}

/* 主内容 */
.main-content {
  position: fixed;
  padding-top: 96px;
  top: 0;
  left: 0;
  right: 0;
  bottom: 96rpx;
}

/* 全宽封面图片 */
.hero-section {
  position: relative;
  width: 100%;
  height: 550rpx;
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: 100%;
}

.image-counter {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 8px;
  border-radius: 12px;
}

.image-counter text {
  font-size: 10px;
  color: #ffffff;
}

/* 商户信息卡片 */
.merchant-card {
  position: relative;
  z-index: 10;
  margin: -96rpx 32rpx 32rpx 32rpx;
  padding: 48rpx;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.05);
  border: 2rpx solid #f0f5ff;
}

.merchant-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #171c20;
  margin-bottom: 16rpx;
  display: block;
}

.category-row {
  margin-bottom: 32rpx;
}

.category-text {
  font-size: 24rpx;
  color: #3e4850;
}

.offer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 48rpx;
}

.badge {
  background: #ffebeb;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.badge-text {
  font-size: 20rpx;
  font-weight: bold;
  color: #ff4d4d;
}

.business-info {
  border-top: 2rpx solid #f0f5ff;
  padding-top: 32rpx;
  margin-bottom: 32rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 32rpx;
  margin-bottom: 16rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 24rpx;
  color: #94a3b8;
  width: 128rpx;
}

.info-value {
  font-size: 24rpx;
  font-weight: 500;
  color: #171c20;
  flex: 1;
}

.call-btn {
  position: absolute;
  right: 48rpx;
  bottom: 48rpx;
  width: 80rpx;
  height: 80rpx;
  background: #fff5f1;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-icon {
  font-size: 40rpx;
  color: #ff6b35;
}

/* 优惠券列表 */
.coupons-section {
  padding: 64rpx 32rpx;
}

.section-header {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #171c20;
}

.empty-coupon {
  background: #ffffff;
  padding: 96rpx 0;
  border-radius: 24rpx;
  text-align: center;
  border: 2rpx solid #f0f5ff;
}

.empty-text {
  font-size: 28rpx;
  color: #94a3b8;
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.coupon-card {
  background: #ffffff;
  border: 2rpx solid #f0f5ff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.05);
}

.coupon-left {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  background: #e3f2fd;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.coupon-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #00aeef;
}

.coupon-unit {
  font-size: 20rpx;
  font-weight: 500;
  color: #00aeef;
}

.coupon-right {
  flex: 1;
  min-width: 0;
}

.coupon-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #171c20;
  margin-bottom: 8rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-desc {
  font-size: 20rpx;
  color: #3e4850;
  margin-bottom: 16rpx;
  display: block;
}

.coupon-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.coupon-price {
  font-size: 28rpx;
  font-weight: bold;
  color: #00aeef;
}

.coupon-original-price {
  font-size: 20rpx;
  color: #94a3b8;
  text-decoration: line-through;
}

.buy-btn {
  flex-shrink: 0;
  background: #00aeef;
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
}

.buy-text {
  font-size: 24rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 底部占位 */
.bottom-placeholder {
  height: 192rpx;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #ffffff;
  border-top: 2rpx solid #f0f5ff;
  padding: 24rpx 64rpx;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 48rpx;
  color: #171c20;
}

.action-label {
  font-size: 20rpx;
  font-weight: 500;
  color: #171c20;
}

.divider {
  width: 2rpx;
  height: 64rpx;
  background: #f0f5ff;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.loading-state text,
.empty-state text {
  font-size: 14px;
  color: #94a3b8;
}
</style>
