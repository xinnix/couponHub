<script setup lang="ts">
import { computed, ref } from 'vue'
import { couponApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

const loading = ref(false)
const couponList = ref<any[]>([])
const searchKeyword = ref('')
const statusBarHeight = ref(0)

// 筛选后的优惠券列表
const filteredCoupons = computed(() => {
  if (!searchKeyword.value) {
    return couponList.value
  }
  return couponList.value.filter(coupon =>
    coupon.title?.toLowerCase().includes(searchKeyword.value.toLowerCase()),
  )
})

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

// 加载优惠券列表
async function loadCoupons() {
  try {
    loading.value = true
    const res = await couponApi.getList({ limit: 50, status: 'ACTIVE' })

    if (res.success && Array.isArray(res.data)) {
      couponList.value = res.data
    }
    else {
      couponList.value = []
    }
  }
  catch (error) {
    console.error('加载优惠券失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
    couponList.value = []
  }
  finally {
    loading.value = false
  }
}

// 格式化优惠券折扣
function formatCouponDiscount(item: any) {
  if (item.discountType === 'PERCENT') {
    return `${item.discountValue}%折扣`
  }
  else if (item.discountType === 'FIXED') {
    return `减¥${item.discountValue}`
  }
  return ''
}

// 计算距离下架的天数（倒计时）
function calculateDaysLeft(item: any) {
  if (!item.saleUntil) {
    return null // 无销售结束时间
  }

  const now = new Date()
  const saleUntil = new Date(item.saleUntil)
  const diffTime = saleUntil.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// 格式化倒计时文案（显示距离下架时间）
function formatCountdown(item: any) {
  const daysLeft = calculateDaysLeft(item)

  if (daysLeft === null) {
    // 无销售结束时间，不显示倒计时
    return ''
  }

  if (daysLeft <= 0) {
    return '已下架'
  }

  if (daysLeft === 1) {
    return '明天下架'
  }

  if (daysLeft <= 3) {
    return `${daysLeft}天后下架`
  }

  if (daysLeft <= 7) {
    return `${daysLeft}天后下架`
  }

  // 如果超过30天，不显示具体倒计时
  if (daysLeft > 30) {
    return ''
  }

  return `${daysLeft}天后下架`
}

// 获取倒计时文案的样式类（根据紧迫程度）
function getCountdownStyle(item: any) {
  const daysLeft = calculateDaysLeft(item)

  if (daysLeft === null || daysLeft > 7) {
    return 'coupon-desc-text' // 默认灰色
  }

  if (daysLeft <= 0) {
    return 'countdown-expired' // 已下架 - 红色
  }

  if (daysLeft <= 3) {
    return 'countdown-urgent' // 非常紧迫 - 红色加粗
  }

  return 'countdown-warning' // 即将下架 - 橙色
}

// 格式化价格显示
function formatPriceDisplay(item: any) {
  const buyPrice = Number(item.buyPrice)
  if (buyPrice === 0) {
    return '免费领'
  }
  return `¥${item.buyPrice} 立即抢`
}

// 计算立省百分比
function calculateSavePercent(item: any) {
  const buyPrice = Number(item.buyPrice)
  const faceValue = Number(item.faceValue)

  if (buyPrice === 0) {
    return '立省 100%'
  }

  if (faceValue <= 0) {
    return ''
  }

  const saveAmount = faceValue - buyPrice
  const savePercent = Math.round((saveAmount / faceValue) * 100)

  if (savePercent <= 0) {
    return ''
  }

  return `立省 ${savePercent}%`
}

// 跳转到优惠券详情
function goToCouponDetail(coupon: any) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${coupon.id}`,
  })
}

// 处理搜索
function handleSearch() {
  console.log('搜索关键词:', searchKeyword.value)
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
}

onMounted(() => {
  loadCoupons()
})

// 下拉刷新
onPullDownRefresh(() => {
  loadCoupons().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<template>
  <view class="coupon-list-page">
    <!-- 背景品牌图案 -->
    <view class="brand-pattern pointer-events-none fixed left-0 top-0 z--1 h-full w-full" :style="{
      backgroundImage: 'url(../static/bg.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '400rpx',
      backgroundPosition: 'center',
      opacity: 0.03,
    }" />

    <!-- TopAppBar -->
    <view class="top-bar-bg sticky top-0 z-50 w-full flex items-center px-6 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }">
      <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && couponList.length === 0" class="flex items-center justify-center py-20">
      <text class="text-on-surface-variant">
        加载中...
      </text>
    </view>

    <!-- 主内容区域 -->
    <view v-else class="page-content">
      <!-- 搜索栏 -->
      <view class="px-6 pb-4 pt-2">
        <view class="search-input-wrapper flex items-center rounded-2xl bg-white px-5 py-3 shadow-ambient">
          <text class="mr-3 text-xl">
            🔍
          </text>
          <input v-model="searchKeyword" class="search-input flex-1 text-sm text-on-surface" type="text"
            placeholder="搜索优惠券" placeholder-class="text-on-surface-variant" @confirm="handleSearch">
          <text v-if="searchKeyword" class="text-xl text-on-surface-variant" @click="clearSearch">
            ✕
          </text>
        </view>
      </view>

      <!-- 标题区域 -->
      <view class="mb-3 flex items-end justify-between px-6">
        <view class="flex flex-col">
          <text class="text-xl text-on-surface font-extrabold">
            热门优惠券
          </text>
          <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
            Hot Vouchers
          </text>
        </view>
        <text class="mb-0.5 text-xs text-primary-container font-bold">
          共{{ filteredCoupons.length }}张
        </text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && filteredCoupons.length === 0" class="flex flex-col items-center justify-center py-20">
        <text class="mb-4 text-6xl">
          🎫
        </text>
        <text class="text-sm text-on-surface-variant">
          暂无优惠券
        </text>
      </view>

      <!-- 优惠券列表 -->
      <view v-else class="coupon-list-container">
        <view class="coupon-grid">
          <view v-for="coupon in filteredCoupons" :key="coupon.id"
            class="coupon-card-bg flex flex-col overflow-hidden border rounded-xl transition-transform duration-200 shadow-card active-scale-98"
            @click="goToCouponDetail(coupon)">
            <!-- 优惠券金额展示 -->
            <view class="coupon-value-section relative overflow-hidden bg-blue-100">
              <view class="flex flex-col items-center justify-center py-6">
                <view class="flex items-baseline gap-1">
                  <text class="text-lg text-primary-container font-bold">
                    ¥
                  </text>
                  <text class="text-4xl text-primary-container font-extrabold leading-none">
                    {{ coupon.faceValue }}
                  </text>
                </view>
              </view>
              <!-- 装饰性圆形 -->
              <view class="absolute h-6 w-6 rounded-full bg-surface -bottom-3 -left-3" />
              <view class="absolute h-6 w-6 rounded-full bg-surface -bottom-3 -right-3" />
            </view>

            <!-- 优惠券信息 -->
            <view class="coupon-info-section relative flex flex-col gap-2 p-4">
              <!-- 装饰性圆形（上方锯齿） -->
              <view class="absolute h-6 w-6 rounded-full -left-3 -top-3" style="background: #F5FAFF;" />
              <view class="absolute h-6 w-6 rounded-full -right-3 -top-3" style="background: #F5FAFF;" />
              <text class="truncate text-sm text-on-surface font-bold leading-tight">
                {{ coupon.title }}
              </text>
              <text class="text-xs text-primary-container font-medium">
                {{ formatCouponDiscount(coupon) }}
              </text>
              <text :class="getCountdownStyle(coupon)" class="text-xs font-medium">
                {{ formatCountdown(coupon) }}
              </text>
              <view class="mt-2 flex items-center justify-between gap-2">
                <text class="rounded bg-blue-50 px-2 py-1 text-10px text-primary-container font-bold">
                  {{ calculateSavePercent(coupon) }}
                </text>
                <view class="text-xs text-primary-container font-bold">
                  {{ formatPriceDisplay(coupon) }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="2" />
  </view>
</template>

<style lang="scss" scoped>
/* 优惠券列表页面 */
.coupon-list-page {
  min-height: 100vh;
  max-width: 100vw;
  width: 100vw;
  background: #F5FAFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow-x: hidden;
  /* 强制禁止横向滚动 */
}

/* 品牌图案背景 */
.brand-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

/* 页面内容区域 */
.page-content {
  width: 100%;
  max-width: 100vw;
  position: relative;
  z-index: 10;
  padding-bottom: 140rpx;
  /* 底部留出 TabBar 空间 */
  overflow-x: hidden;
  /* 强制禁止横向滚动 */
}

/* 优惠券列表容器 */
.coupon-list-container {
  width: 100%;
  padding: 0 24rpx 24rpx;
  /* 使用 rpx 单位，左右各 24rpx */
  box-sizing: border-box;
  /* 确保 padding 不增加总宽度 */
}

/* 优惠券网格布局 */
.coupon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* 两列，每列等宽 */
  gap: 24rpx;
  /* 列间距 24rpx */
  width: 100%;
  box-sizing: border-box;
  /* 确保 gap 不增加总宽度 */
}

/* 顶部栏背景 */
.top-bar-bg {
  width: 100%;
  max-width: 100vw;
  background: rgba(245, 250, 255, 0.9);
  overflow-x: hidden;
}

/* Logo 图片 */
.logo-image {
  width: 200rpx;
  height: 80rpx;
}

/* 自定义阴影效果 */
.shadow-ambient {
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
}

.shadow-card {
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.03);
}

/* 激活态缩放效果 */
.active-scale-98:active {
  transform: scale(0.98);
}

/* 搜索输入框 */
.search-input-wrapper {
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

.search-input {
  font-size: 28rpx;
}

/* 优惠券卡片背景 */
.coupon-card-bg {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(189, 200, 209, 0.3);
  box-sizing: border-box;
  /* 确保 padding 和 border 不增加宽度 */
}

/* 优惠券金额区域 */
.coupon-value-section {
  position: relative;
  border-bottom: 2rpx dashed rgba(189, 200, 209, 0.3);
  background: #E0F2FF;
  /* 深一点的蓝色背景 */
}

/* 优惠券信息区域 */
.coupon-info-section {
  position: relative;
  background: rgba(255, 255, 255, 0.9);
}

/* 优惠券描述文字 */
.coupon-desc-text {
  color: rgba(110, 120, 129, 0.7);
}

/* 倒计时样式 - 已下架 */
.countdown-expired {
  color: #EF4444;
  /* 红色 */
  font-weight: 600;
}

/* 倒计时样式 - 非常紧迫（<=3天） */
.countdown-urgent {
  color: #EF4444;
  /* 红色 */
  font-weight: 700;
}

/* 倒计时样式 - 即将下架（4-7天） */
.countdown-warning {
  color: #F97316;
  /* 橙色 */
  font-weight: 600;
}

/* 文字截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
