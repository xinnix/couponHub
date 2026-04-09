<script setup lang="ts">
import { ref, computed } from 'vue'
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
    coupon.title?.toLowerCase().includes(searchKeyword.value.toLowerCase())
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
    } else {
      couponList.value = []
    }
  } catch (error) {
    console.error('加载优惠券失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
    couponList.value = []
  } finally {
    loading.value = false
  }
}

// 格式化优惠券折扣
function formatCouponDiscount(item: any) {
  if (item.discountType === 'PERCENT') {
    return `${item.discountValue}%折扣`
  } else if (item.discountType === 'FIXED') {
    return `减¥${item.discountValue}`
  }
  return ''
}

// 格式化有效期
function formatValidity(item: any) {
  if (item.validFrom && item.validUntil) {
    const from = new Date(item.validFrom).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric'
    })
    const until = new Date(item.validUntil).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric'
    })
    return `${from}-${until}可用`
  }
  return '长期有效'
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
  <view class="relative min-h-screen bg-surface text-on-surface font-body antialiased">
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
      <view class="px-6 pt-2 pb-4">
        <view class="search-input-wrapper flex items-center bg-white rounded-2xl px-5 py-3 shadow-ambient">
          <text class="text-xl mr-3">🔍</text>
          <input
            v-model="searchKeyword"
            class="search-input flex-1 text-sm text-on-surface"
            type="text"
            placeholder="搜索优惠券"
            placeholder-class="text-on-surface-variant"
            @confirm="handleSearch"
          />
          <text v-if="searchKeyword" class="text-xl text-on-surface-variant" @click="clearSearch">✕</text>
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
        <text class="text-6xl mb-4">🎫</text>
        <text class="text-on-surface-variant text-sm">暂无优惠券</text>
      </view>

      <!-- 优惠券列表 -->
      <view v-else class="px-6 pb-6">
        <view class="grid grid-cols-2 gap-4">
          <view
            v-for="coupon in filteredCoupons"
            :key="coupon.id"
            class="coupon-card-bg flex flex-col overflow-hidden border rounded-xl transition-transform duration-200 shadow-card active-scale-98"
            @click="goToCouponDetail(coupon)"
          >
            <!-- 优惠券金额展示 -->
            <view class="coupon-value-section relative overflow-hidden bg-blue-50">
              <view class="flex flex-col items-center justify-center py-6">
                <view class="flex items-baseline gap-1">
                  <text class="text-lg text-primary-container font-bold">¥</text>
                  <text class="text-4xl text-primary-container font-extrabold leading-none">
                    {{ coupon.faceValue }}
                  </text>
                </view>
                <text class="mt-2 text-sm text-on-surface-variant font-bold">
                  售价 ¥{{ coupon.buyPrice }}
                </text>
              </view>
              <!-- 装饰性圆形 -->
              <view class="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-surface"></view>
              <view class="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-surface"></view>
            </view>

            <!-- 优惠券信息 -->
            <view class="flex flex-col gap-2 p-4">
              <text class="truncate text-13px text-on-surface font-bold leading-tight">
                {{ coupon.title }}
              </text>
              <text class="text-11px text-primary-container font-medium">
                {{ formatCouponDiscount(coupon) }}
              </text>
              <text class="coupon-desc-text text-10px font-medium">
                {{ formatValidity(coupon) }}
              </text>
              <view class="mt-2 flex items-center justify-between">
                <text class="text-10px text-primary-container font-bold bg-blue-50 px-2 py-1 rounded">
                  全场通用
                </text>
                <text class="text-xs text-primary-container font-bold">
                  立即抢 →
                </text>
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
  position: relative;
  z-index: 10;
  padding-bottom: 140rpx;
}

/* 顶部栏背景 */
.top-bar-bg {
  background: rgba(245, 250, 255, 0.9);
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
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(189, 200, 209, 0.3);
}

/* 优惠券金额区域 */
.coupon-value-section {
  position: relative;
  border-bottom: 2rpx dashed rgba(189, 200, 209, 0.3);
}

/* 优惠券描述文字 */
.coupon-desc-text {
  color: rgba(110, 120, 129, 0.7);
}

/* 文字截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>