<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { couponApi, merchantApi, newsApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

definePage({
  type: 'home',
})

// 状态栏高度
const statusBarHeight = ref(0)

// 状态
const currentArea = ref('全部')
const loading = ref(false)

// 区域列表
const areas = ['全部', 'A区', 'B区', 'C区']

// 优惠券数据
const vouchers = ref<any[]>([])

// 分类数据
const categories = ref([
  { id: 1, name: '特色餐饮', icon: 'icon-tesecanyin' },
  { id: 2, name: '休闲娱乐', icon: 'icon-xx' },
  { id: 3, name: '零售商超', icon: 'icon-shangchao-01' },
  { id: 4, name: '智慧教培', icon: 'icon-jiaopeiwangputong' },
])

// 商户数据
const merchants = ref<any[]>([])

// 新闻数据
const newsList = ref<any[]>([])

// Hero 新闻（头图）
const heroNews = ref<any[]>([])

// 当前 Hero 新闻索引
const currentHeroIndex = ref(0)

// 自动轮播定时器
let autoPlayTimer: any = null

// 筛选商户
const filteredMerchants = computed(() => {
  if (currentArea.value === '全部') {
    return merchants.value
  }
  return merchants.value.filter(m => m.area === currentArea.value)
})

// 切换区域
function switchArea(area: string) {
  currentArea.value = area
}

// 抢购优惠券 - 跳转到详情页
function grabVoucher(voucher: any) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${voucher.id}`,
  })
}

// 查看商户详情
function goToMerchant(merchant: any) {
  uni.showToast({
    title: '商户详情功能开发中',
    icon: 'none',
  })
}

// 加载首页数据
async function loadHomeData() {
  loading.value = true
  try {
    // 并行加载三个接口数据
    const [merchantsRes, newsRes, couponsRes] = await Promise.all([
      merchantApi.getList({ limit: 20, status: 'ACTIVE' }),
      newsApi.getList({ limit: 10, status: 'PUBLISHED' }),
      couponApi.getList({ limit: 10, status: 'ACTIVE' }),
    ])

    // 处理商户数据
    if (merchantsRes.success && merchantsRes.data) {
      merchants.value = merchantsRes.data.map((m: any) => {
        // 确保 image 字段有值，优先使用 logo
        const imageUrl = m.logo && m.logo.trim() !== ''
          ? m.logo
          : `https://picsum.photos/seed/merchant-${m.id}/200/200`

        const merchantItem = {
          id: m.id,
          name: m.name,
          desc: m.description || m.category,
          image: imageUrl,
          area: m.area || 'A区',
        }
        console.log('商户数据项:', merchantItem)
        return merchantItem
      })
      console.log('商户列表:', merchants.value)
    }

    // 处理新闻数据
    if (newsRes.success && newsRes.data) {
      const allNews = newsRes.data

      // 提取 Hero 新闻（isHero 为 true）
      heroNews.value = allNews
        .filter((n: any) => n.isHero === true)
        .map((n: any) => ({
          id: n.id,
          title: n.title,
          image: n.bannerUrl || `https://picsum.photos/seed/hero-${n.id}/800/450`,
          tag: 'Featured Event',
        }))

      // 提取普通新闻（isHero 为 false 或不存在）
      newsList.value = allNews
        .filter((n: any) => !n.isHero)
        .slice(0, 4)
        .map((n: any) => {
          // 确保 image 字段有值，优先使用 bannerUrl
          const imageUrl = n.bannerUrl && n.bannerUrl.trim() !== ''
            ? n.bannerUrl
            : `https://picsum.photos/seed/news-${n.id}/400/300`

          const newsItem = {
            id: n.id,
            title: n.title,
            date: new Date(n.createdAt).toLocaleDateString('zh-CN'),
            tag: n.status === 'PUBLISHED' ? '公告' : '活动',
            image: imageUrl,
          }
          console.log('新闻数据项:', newsItem)
          return newsItem
        })

      console.log('Hero 新闻:', heroNews.value)
      console.log('新闻列表:', newsList.value)

      // 启动自动轮播
      startAutoPlay()
    }

    // 处理优惠券数据
    if (couponsRes.success && couponsRes.data) {
      vouchers.value = couponsRes.data.map((c: any) => ({
        id: c.id,
        price: Number(c.buyPrice),
        value: Number(c.faceValue),
        desc: c.description || `${c.title}\n限时抢购`,
      }))
    }
  }
  catch (error) {
    console.error('加载首页数据失败:', error)
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  // 获取系统信息，设置状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  loadHomeData()
})

// 启动自动轮播
function startAutoPlay() {
  if (heroNews.value.length > 1) {
    autoPlayTimer = setInterval(() => {
      currentHeroIndex.value = (currentHeroIndex.value + 1) % heroNews.value.length
    }, 3000) // 3秒切换一次
  }
}

// 停止自动轮播
function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

// 手动切换轮播
function onSwiperChange(e: any) {
  currentHeroIndex.value = e.detail.current
}

// 下拉刷新
function onRefresh() {
  return loadHomeData()
}

// 图片加载错误处理
function onImageError(e: any, type: string, id: string) {
  console.error(`${type}图片加载失败:`, id, e)
  // 如果图片加载失败，可以在这里设置默认图片
}

// 图片加载成功处理
function onImageLoad(type: string, id: string) {
  console.log(`${type}图片加载成功:`, id)
}

// 获取默认图片
function getDefaultImage(type: string, id: string) {
  return `https://picsum.photos/seed/${type}-${id}/400/300`
}
</script>

<template>
  <view class="relative min-h-screen bg-surface text-on-surface font-body antialiased" style="padding-bottom: 200rpx;">
    <!-- 背景品牌图案 -->
    <view class="brand-pattern pointer-events-none fixed left-0 top-0 z--1 h-full w-full" :style="{
      backgroundImage: 'url(../static/bg.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '400rpx',
      backgroundPosition: 'center',
      opacity: 0.03,
    }" />

    <!-- 主内容区域 -->
    <view v-if="loading && merchants.length === 0" class="flex items-center justify-center py-20">
      <text class="text-on-surface-variant">
        加载中...
      </text>
    </view>

    <!-- TopAppBar -->
    <view class="top-bar-bg sticky top-0 z-50 w-full flex items-center px-4 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }">
      <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && merchants.length === 0" class="flex items-center justify-center py-20">
      <text class="text-on-surface-variant">
        加载中...
      </text>
    </view>

    <!-- 主内容区域 -->
    <scroll-view v-else scroll-y refresher-enabled :refresher-triggered="loading" class="relative z-10 pb-24"
      @refresherrefresh="onRefresh">
      <!-- Hero Section - 轮播图 -->
      <view class="px-6 pt-1">
        <swiper v-if="heroNews.length > 0" class="banner-swiper" :indicator-dots="heroNews.length > 1"
          :autoplay="heroNews.length > 1" :interval="3000" :duration="500" :circular="true"
          indicator-color="rgba(255, 255, 255, 0.5)" indicator-active-color="#ffffff" @change="onSwiperChange">
          <swiper-item v-for="(news, index) in heroNews" :key="news.id">
            <view class="relative h-full w-full overflow-hidden rounded-2xl shadow-lg">
              <image class="h-full w-full" :src="news.image" mode="aspectFill" />
              <view class="banner-overlay-bg absolute inset-0 flex flex-col justify-end p-6">
                <text class="banner-tag-text mb-1 text-xs font-bold tracking-widest uppercase">
                  {{ news.tag || 'Featured Event' }}
                </text>
                <text class="text-2xl text-white font-extrabold leading-tight line-clamp-2">
                  {{ news.title }}
                </text>
              </view>
            </view>
          </swiper-item>
        </swiper>
        <view v-else class="relative h-420rpx w-full overflow-hidden rounded-2xl shadow-lg">
          <image class="h-full w-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7mJHuMWILTiyDVLj7hPfpemu_JwcxVMMIdJPiLn-fXWWoaB0jeEfPjPpckVoq8DGuUTMLmEW1sioMf5rF-Alszf7ueqCfBxbtZxktQOeg-fwlsly-BExX0WTaarT0zLBET3PTgZiS-0j-Igp8I3UCnScIAxeKd5q1a2x7qe_wJTbeVFPnOt0Pi0g3KvZBU91dA7wbvksDHTzP_XAukTEgFVPdai_G6ZLZcSB1FieEbEn5XkAij_r5lghZ_XoijlTZ38ubk-XNVnU"
            mode="aspectFill" />
          <view class="banner-overlay-bg absolute inset-0 flex flex-col justify-end p-6">
            <text class="banner-tag-text mb-1 text-xs font-bold tracking-widest uppercase">
              Featured Event
            </text>
            <text class="text-2xl text-white font-extrabold leading-tight">
              悦享邻里味 · 汉都初冬美食季
            </text>
          </view>
        </view>
      </view>

      <!-- Hot Vouchers -->
      <view class="py-4">
        <view class="mb-3 flex items-end justify-between px-6">
          <view class="flex flex-col">
            <text class="text-xl text-on-surface font-extrabold">
              抢购超值券
            </text>
            <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
              Limited Offer
            </text>
          </view>
          <text class="mb-0.5 text-xs text-primary-container font-bold">
            更多优惠 →
          </text>
        </view>
        <scroll-view class="no-scrollbar overflow-x-auto px-6" scroll-x enable-flex>
          <view class="flex gap-4 pb-2">
            <view v-for="voucher in vouchers" :key="voucher.id"
              class="voucher-card relative flex flex-none flex-col overflow-hidden rounded-xl p-2.5 shadow-ambient active-scale-95"
              @click="grabVoucher(voucher)">
              <view class="absolute bottom-0 left-0 top-0 w-1 rounded-l bg-primary-container" />
              <view class="mb-2 pl-2">
                <view class="mb-1 flex items-baseline gap-0.5">
                  <text class="text-2xl text-primary-container font-extrabold">
                    {{ voucher.price }}
                  </text>
                  <text class="text-xs text-on-surface-variant font-bold">
                    元
                  </text>
                </view>
                <text class="voucher-desc-text text-10px font-medium leading-relaxed">
                  {{ voucher.desc }}
                </text>
              </view>
              <button
                class="mt-auto w-full rounded-lg bg-primary-container py-1.5 text-xs text-white font-bold transition-transform active-scale-95">
                立即抢
              </button>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Merchant List -->
      <view class="px-6">
        <view class="mb-3 flex items-end justify-between">
          <view class="flex flex-col">
            <text class="text-xl text-on-surface font-extrabold leading-tight">
              汉都天地 · 严选
            </text>
            <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
              Selected Stores
            </text>
          </view>
          <text class="mb-0.5 text-xs text-primary-container font-bold">
            查看全部 →
          </text>
        </view>
        <scroll-view class="mb-4 flex no-scrollbar overflow-x-auto py-1" scroll-x enable-flex>
          <view v-for="area in areas" :key="area" class="area-tag"
            :class="[currentArea === area ? 'area-tag-active' : 'area-tag-inactive']" @click="switchArea(area)">
            <text class="text-xs font-bold">
              {{ area }}
            </text>
          </view>
        </scroll-view>
        <!-- Categories Grid -->

        <view class="grid grid-cols-4 gap-2">
          <view v-for="merchant in filteredMerchants" :key="merchant.id"
            class="merchant-card-bg border-outline-variant-30 flex flex-col overflow-hidden border rounded-lg transition-transform duration-200 shadow-card active-scale-98"
            @click="goToMerchant(merchant)">
            <view class="merchant-image-container bg-gray-100">
              <image class="h-full w-full object-cover" :src="merchant.image" mode="aspectFill" lazy-load
                @error="(e) => onImageError(e, '商户', merchant.id)" @load="onImageLoad('商户', merchant.id)" />
            </view>
            <view class="flex flex-col gap-0.5 p-1.5">
              <text class="truncate text-9px text-on-surface font-bold leading-tight">
                {{ merchant.name }}
              </text>
              <text class="merchant-desc-text truncate text-8px font-medium">
                {{ merchant.desc }}
              </text>
            </view>
          </view>
        </view>
        <!-- <view class="grid grid-cols-4 gap-4 px-6 pb-4">
          <view v-for="cat in categories" :key="cat.id"
            class="group flex flex-col items-center gap-1.5 transition-transform active-scale-95">
            <view
              class="category-icon-bg ring-primary-container-10 h-14 w-14 flex items-center justify-center rounded-2xl text-primary-container shadow-sm ring-1">
              <text class="iconfont" :class="cat.icon" />
            </view>
            <text class="text-10px text-on-surface-variant font-bold tracking-wider">
              {{ cat.name }}
            </text>
          </view>
        </view> -->
      </view>

      <!-- Mall News Section -->
      <view class="mt-4 px-6">
        <view class="mb-3 flex flex-col">
          <text class="text-xl text-on-surface font-extrabold leading-tight">
            商场快讯
          </text>
          <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
            Latest News
          </text>
        </view>
        <view class="grid grid-cols-2 gap-4">
          <view v-for="news in newsList" :key="news.id"
            class="group flex flex-col gap-2 transition-transform active-scale-98">
            <view class="news-image-aspect relative overflow-hidden rounded-xl bg-gray-100 shadow-sm">
              <image class="h-full w-full object-cover" :src="news.image" mode="aspectFill" lazy-load
                @error="(e) => onImageError(e, '新闻', news.id)" @load="onImageLoad('新闻', news.id)" />
            </view>
            <view class="px-0.5">
              <text class="text-11px text-on-surface font-bold leading-snug line-clamp-2">
                {{ news.title }}
              </text>
              <text class="news-date-text mt-1 text-9px font-medium italic">
                {{ news.date }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="0" />
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
.active-scale-95:active {
  transform: scale(0.95);
}

.active-scale-98:active {
  transform: scale(0.98);
}

/* 文字截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* Mix blend mode */
.mix-blend-multiply {
  mix-blend-mode: multiply;
}

/* 纵横比 */
.banner-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
}

/* 轮播图样式 */
.banner-swiper {
  width: 100%;
  height: 420rpx;
  /* 固定高度，约等于 16:9 比例 */
}

.merchant-image-container {
  width: 100%;
  height: 0;
  padding-bottom: 100%;
  /* 1:1 正方形 */
  position: relative;
}

.merchant-image-container image {
  position: absolute;
  top: 0;
  left: 0;
}

.news-image-aspect {
  width: 100%;
  height: 0;
  padding-bottom: 75%;
  /* 4:3 比例 */
  position: relative;
}

.news-image-aspect image {
  position: absolute;
  top: 0;
  left: 0;
}

/* 区域标签样式 */
.area-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  transition: all 0.3s ease;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  min-width: 72rpx;
  margin: 0 8rpx;
}

.area-tag:first-child {
  margin-left: 0;
}

.area-tag:last-child {
  margin-right: 0;
}

.area-tag text {
  font-size: 22rpx;
}

.area-tag-active {
  background: #00aeef;
  color: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 174, 239, 0.25);
  transform: scale(1.02);
}

.area-tag-inactive {
  background: rgba(255, 255, 255, 0.9);
  color: #6e7881;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
}

.area-tag-inactive:active {
  transform: scale(0.95);
}

/* 区域按钮样式（已废弃） */
.area-btn-active {
  background: #00aeef;
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 174, 239, 0.2);
}

.area-btn-inactive {
  background: rgba(228, 233, 238, 0.6);
  color: #6e7881;
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 区域标签样式 */
.banner-overlay-bg {
  background: linear-gradient(to top, rgba(23, 28, 32, 0.75), transparent);
}

/* Banner 标签文字 */
.banner-tag-text {
  color: rgba(255, 255, 255, 0.9);
}

/* 优惠券卡片背景 */
.voucher-card-bg {
  background: rgba(255, 255, 255, 0.9);
}

/* 优惠券卡片 */
.voucher-card {
  width: 260rpx;
  min-width: 260rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 优惠券描述文字 */
.voucher-desc-text {
  color: rgba(110, 120, 129, 0.7);
  white-space: pre-line;
}

/* 分类图标背景 */
.category-icon-bg {
  background: rgba(239, 244, 250, 0.8);
}

/* 分类图标样式 */
.category-icon-bg .iconfont {
  color: #00AEEF;
  font-size: 28px;
}

/* 分类图标边框 */
.ring-primary-container-10 {
  box-shadow: inset 0 0 0 2rpx rgba(0, 174, 239, 0.1);
}

/* 商户卡片背景 */
.merchant-card-bg {
  background: rgba(255, 255, 255, 0.9);
}

/* 商户描述文字 */
.merchant-desc-text {
  color: rgba(110, 120, 129, 0.8);
}

/* 边框透明度 */
.border-outline-variant-30 {
  border-color: rgba(189, 200, 209, 0.3);
}

/* 新闻日期文字 */
.news-date-text {
  color: rgba(110, 120, 129, 0.6);
}
</style>
