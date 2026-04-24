<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { authApi } from '@/api/auth'
import { couponApi, merchantApi, newsApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'
import NewsPopup from '@/components/NewsPopup.vue'

definePage({
  type: 'home',
  style: {
    enablePullDownRefresh: true,
    backgroundColor: '#F5FAFF',
  },
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

// 商户数据（直接使用，不再需要前端筛选）
const merchants = ref<any[]>([])

// 新闻数据
const newsList = ref<any[]>([])

// Hero 新闻（头图）
const heroNews = ref<any[]>([])

// 弹窗新闻
const popupNews = ref<any>(null)
const showPopup = ref(false)

// 当前 Hero 新闻索引
const currentHeroIndex = ref(0)

// 自动轮播定时器
let autoPlayTimer: any = null

// 切换区域并重新加载数据
async function switchArea(area: string) {
  currentArea.value = area
  await loadMerchants(area)
}

// 抢购优惠券 - 跳转到详情页
function grabVoucher(voucher: any) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${voucher.id}`,
  })
}

// 查看商户详情
function goToMerchant(merchant: any) {
  console.log('====== 首页商户点击 ======')
  console.log('商户 ID:', merchant.id)
  console.log('商户名称:', merchant.name)

  if (!merchant.id) {
    console.error('❌ 商户 ID 为空')
    uni.showToast({
      title: '商户ID无效',
      icon: 'none',
    })
    return
  }

  console.log('✅ 准备跳转到商户详情页')
  uni.navigateTo({
    url: `/pages/merchant/detail?id=${merchant.id}`,
    success: () => {
      console.log('✅ 跳转成功')
    },
    fail: (err) => {
      console.error('❌ 跳转失败:', err)
      uni.showToast({
        title: '跳转失败',
        icon: 'none',
      })
    },
  })
}

// 跳转到商户列表页面
function handleGoToMerchantList() {
  uni.navigateTo({
    url: '/pages/merchant/list',
  })
}

// 跳转到优惠券列表页面
function goToCouponList() {
  uni.navigateTo({
    url: '/pages/coupon/list',
  })
}

// 查看新闻详情
function goToNewsDetail(news: any) {
  uni.navigateTo({
    url: `/pages/news/detail?id=${news.id}`,
  })
}

// 加载商户数据（根据区域动态加载）
async function loadMerchants(area: string = '全部') {
  try {
    // 构建API参数
    const params: any = { limit: 6, status: 'ACTIVE' }

    // 如果选择了特定区域，添加 area 筛选参数
    if (area !== '全部') {
      params.area = area
    }

    const merchantsRes = await merchantApi.getList(params)

    // 处理商户数据
    if (merchantsRes.success && merchantsRes.data) {
      merchants.value = merchantsRes.data.map((m: any) => {
        // 确保 image 字段有值，优先使用 logo
        const imageUrl = m.logo && m.logo.trim() !== ''
          ? m.logo
          : `https://picsum.photos/seed/merchant-${m.id}/200/200`

        // 处理 category：如果是对象取 name，否则直接使用
        const categoryDisplay = m.category?.name || m.category || ''

        const merchantItem = {
          id: m.id,
          name: m.name,
          desc: m.description || categoryDisplay,
          image: imageUrl,
          area: m.area || '未分配', // 使用真实的区域数据，如果没有则标记为"未分配"
        }
        console.log('商户数据项:', merchantItem)
        return merchantItem
      })
      console.log('商户列表:', merchants.value)
    }
  }
  catch (error) {
    console.error('加载商户失败:', error)
    uni.showToast({
      title: '加载商户失败',
      icon: 'none',
    })
  }
}

// 加载首页数据
async function loadHomeData() {
  loading.value = true
  try {
    // 并行加载三个接口数据（商户、新闻、优惠券）
    const [newsRes, couponsRes, popupRes] = await Promise.all([
      newsApi.getList({ limit: 10, status: 'PUBLISHED' }),
      couponApi.getList({ limit: 10, status: 'ACTIVE', featuredOnHome: true }),
      newsApi.getPopup(), // 新增：获取弹窗新闻
    ])

    // 加载商户数据（默认加载"全部"区域的商户）
    await loadMerchants('全部')

    // 处理弹窗新闻
    if (popupRes.success && popupRes.data) {
      const news = popupRes.data

      // 检查关闭记录
      const closedPopups = uni.getStorageSync('closedPopups') || {}
      const record = closedPopups[news.id]

      if (record && record.lastClosed) {
        const hoursPassed = (new Date().getTime() - new Date(record.lastClosed).getTime()) / (1000 * 60 * 60)

        // 如果超过24小时，重置计数，重新显示弹窗
        if (hoursPassed >= 24) {
          // 重置计数
          closedPopups[news.id] = { count: 0, lastClosed: null }
          uni.setStorageSync('closedPopups', closedPopups)
          popupNews.value = news
          showPopup.value = true
        }
        else {
          // 24小时内，检查关闭次数
          if (record.count < 5) {
            // 关闭次数不足5次，继续显示弹窗
            popupNews.value = news
            showPopup.value = true
          }
          // 关闭次数 >= 5，不显示弹窗
        }
      }
      else {
        // 从未关闭过，直接显示
        popupNews.value = news
        showPopup.value = true
      }
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
        title: c.title, // 优惠券名称
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

// 弹窗关闭处理
function handlePopupClose() {
  showPopup.value = false
}

// 查看弹窗新闻详情
function handlePopupGoToDetail(id: string) {
  uni.navigateTo({
    url: `/pages/news/detail?id=${id}`,
  })
}

// 页面加载时获取数据
onMounted(() => {
  // 获取系统信息，设置状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  // 检查核销员身份，如果是核销员则跳转到核销员首页

  loadHomeData()
})

onLoad(() => {
  // 页面加载时刷新用户信息

  checkHandlerIdentity()
})

// 页面显示时刷新用户信息
onShow(async () => {
  await refreshUserInfo()
})

// 刷新用户信息
async function refreshUserInfo() {
  const token = uni.getStorageSync('token')

  // 如果已登录，刷新用户信息
  if (token) {
    try {
      const res = await authApi.getProfile()
      if (res.data) {
        // 更新本地存储的用户信息
        uni.setStorageSync('userInfo', res.data)
        console.log('用户信息已刷新:', res.data)
      }
    }
    catch (error) {
      console.error('刷新用户信息失败:', error)
      // 如果获取用户信息失败（可能 token 过期），不强制跳转登录页
      // 让用户在需要时主动登录
    }
  }
}

// 检查核销员身份
async function checkHandlerIdentity() {
  const token = uni.getStorageSync('token')

  // 已登录，实时检查核销员身份
  if (token) {
    try {
      const res = await authApi.checkHandlerStatus()
      if (res.data?.isHandler && res.data?.handler) {
        console.log('用户是核销员，跳转到核销员首页')
        uni.setStorageSync('isHandler', true)
        uni.setStorageSync('handlerInfo', res.data.handler)
        uni.reLaunch({ url: '/pages/handler/index' })
      }
      else {
        // 清除旧的核销员标记
        uni.removeStorageSync('isHandler')
        uni.removeStorageSync('handlerInfo')
      }
    }
    catch (error) {
      console.error('检查核销员身份失败:', error)
      // 接口失败时不跳转，留在首页
    }
  }
}

// 页面下拉刷新
onPullDownRefresh(() => {
  loadHomeData().finally(() => {
    uni.stopPullDownRefresh()
  })
})

// 页面卸载时清理定时器
onUnmounted(() => {
  stopAutoPlay()
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
  <view class="page-root">
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

    <!-- 弹窗新闻 -->
    <NewsPopup v-if="popupNews && showPopup" :news="popupNews" @close="handlePopupClose"
      @go-to-detail="handlePopupGoToDetail" />

    <!-- 加载状态 -->
    <view v-if="loading && merchants.length === 0" class="flex items-center justify-center py-20">
      <text class="text-on-surface-variant">
        加载中...
      </text>
    </view>

    <!-- 主内容区域 -->
    <view v-else class="page-content">
      <!-- Hero Section - 轮播图 -->
      <view class="px-4 pt-1">
        <swiper v-if="heroNews.length > 0" class="banner-swiper" :indicator-dots="heroNews.length > 1"
          :autoplay="heroNews.length > 1" :interval="3000" :duration="500" :circular="true"
          indicator-color="rgba(255, 255, 255, 0.5)" indicator-active-color="#ffffff" @change="onSwiperChange">
          <swiper-item v-for="(news, index) in heroNews" :key="news.id">
            <view class="relative h-full w-full overflow-hidden rounded-lg shadow-lg" @click="goToNewsDetail(news)">
              <image class="h-full w-full" :src="news.image" mode="aspectFill" />
            </view>
          </swiper-item>
        </swiper>
        <view v-else class="relative h-420rpx w-full overflow-hidden rounded-lg shadow-lg">
          <image class="h-full w-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7mJHuMWILTiyDVLj7hPfpemu_JwcxVMMIdJPiLn-fXWWoaB0jeEfPjPpckVoq8DGuUTMLmEW1sioMf5rF-Alszf7ueqCfBxbtZxktQOeg-fwlsly-BExX0WTaarT0zLBET3PTgZiS-0j-Igp8I3UCnScIAxeKd5q1a2x7qe_wJTbeVFPnOt0Pi0g3KvZBU91dA7wbvksDHTzP_XAukTEgFVPdai_G6ZLZcSB1FieEbEn5XkAij_r5lghZ_XoijlTZ38ubk-XNVnU"
            mode="aspectFill" />
        </view>
      </view>

      <!-- Hot Vouchers -->
      <view class="py-4">
        <view class="mb-3 flex items-end justify-between px-4">
          <view class="flex flex-col">
            <text class="text-xl text-on-surface font-extrabold">
              抢购超值券
            </text>
            <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
              Limited Offer
            </text>
          </view>
          <text class="mb-0.5 text-xs text-primary-container font-bold" @click="goToCouponList">
            更多优惠 →
          </text>
        </view>
        <scroll-view class="voucher-scroll no-scrollbar px-4" scroll-x enable-flex>
          <view class="flex gap-3 pb-2">
            <view v-for="voucher in vouchers" :key="voucher.id"
              class="voucher-card relative flex flex-none flex-col overflow-hidden rounded-lg p-2 shadow-ambient active-scale-95"
              @click="grabVoucher(voucher)">
              <view class="absolute bottom-0 left-0 top-0 w-1 rounded-l bg-primary-container" />
              <view class="mb-1 pl-2">
                <view class="mb-1">
                  <text class="voucher-title-text text-sm text-on-surface font-bold leading-tight">
                    {{ voucher.title }}
                  </text>
                </view>
                <view class="mb-1 flex items-baseline gap-1">
                  <text class="text-base text-primary-container font-extrabold">
                    {{ voucher.price === 0 ? '免费领' : `¥${voucher.price}` }}
                  </text>
                  <text class="value-text text-xs">
                    ¥{{ voucher.value }}
                  </text>
                </view>
                <view class="voucher-desc-text truncate text-9px font-medium">
                  {{ voucher.desc }}
                </view>
              </view>
              <button
                class="mt-1 w-full rounded-md bg-primary-container py-1 text-10px text-white font-bold transition-transform active-scale-95">
                {{ voucher.price === 0 ? '免费领' : '立即抢' }}
              </button>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Merchant List -->
      <view class="px-4">
        <view class="mb-3 flex items-end justify-between">
          <view class="flex flex-col">
            <text class="text-xl text-on-surface font-extrabold leading-tight">
              汉都天地 · 严选
            </text>
            <text class="text-10px text-primary-container font-extrabold tracking-widest uppercase">
              Selected Stores
            </text>
          </view>
          <text class="mb-0.5 text-xs text-primary-container font-bold" @click="handleGoToMerchantList">
            查看全部 →
          </text>
        </view>
        <scroll-view class="area-scroll mb-4 no-scrollbar py-1" scroll-x enable-flex>
          <view class="flex gap-2">
            <view v-for="area in areas" :key="area" class="area-tag"
              :class="[currentArea === area ? 'area-tag-active' : 'area-tag-inactive']" @click="switchArea(area)">
              <text class="text-xs font-bold">
                {{ area }}
              </text>
            </view>
          </view>
        </scroll-view>
        <!-- Categories Grid -->

        <view class="grid grid-cols-3 gap-2">
          <view v-for="merchant in merchants" :key="merchant.id"
            class="merchant-card-bg border-outline-variant-30 flex flex-col overflow-hidden border rounded-lg transition-transform duration-200 shadow-card active-scale-98"
            @click="goToMerchant(merchant)">
            <view class="merchant-image-container-tall bg-gray-100">
              <image class="h-full w-full object-cover" :src="merchant.image" mode="aspectFill" lazy-load
                @error="(e) => onImageError(e, '商户', merchant.id)" @load="onImageLoad('商户', merchant.id)" />
            </view>
            <view class="flex flex-col gap-1 p-2">
              <text class="merchant-name-text text-left text-11px text-on-surface font-bold leading-tight">
                {{ merchant.name }}
              </text>
              <text class="merchant-desc-text text-left text-10px font-medium">
                {{ merchant.desc }}
              </text>
            </view>
          </view>
        </view>
        <!-- <view class="grid grid-cols-4 gap-4 px-6 pb-4">
          <view v-for="cat in categories" :key="cat.id"
            class="group flex flex-col items-center gap-1.5 transition-transform active-scale-95">
            <view
              class="category-icon-bg ring-primary-container-10 h-14 w-14 flex items-center justify-center rounded-lg text-primary-container shadow-sm ring-1">
              <text class="iconfont" :class="cat.icon" />
            </view>
            <text class="text-10px text-on-surface-variant font-bold tracking-wider">
              {{ cat.name }}
            </text>
          </view>
        </view> -->
      </view>

      <!-- Mall News Section -->
      <view class="mt-4 px-4">
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
            class="group flex flex-col gap-2 transition-transform active-scale-98" @click="goToNewsDetail(news)">
            <view class="news-image-aspect relative overflow-hidden rounded-lg bg-gray-100 shadow-sm">
              <image class="h-full w-full object-cover" :src="news.image" mode="aspectFill" lazy-load
                @error="(e) => onImageError(e, '新闻', news.id)" @load="onImageLoad('新闻', news.id)" />
            </view>
            <view class="px-0.5">
              <text class="text-11px text-on-surface font-bold leading-snug line-clamp-2">
                {{ news.title }}
              </text>
              <text class="news-date-text mt-1 text-9px font-medium">
                {{ news.date }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="0" />
  </view>
</template>

<style lang="scss" scoped>
/* 页面根元素 - 强制约束宽度 */
.page-root {
  position: relative;
  min-height: 100vh;
  background-color: #F5FAFF;
  color: #1c1c1c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  /* 强制防止横向溢出 */
  width: 100vw;
  max-width: 100vw;
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
  position: relative;
  z-index: 10;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  overflow-x: hidden;
  /* 防止横向溢出 */
  width: 100%;
  max-width: 100vw;
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
  border-radius: 16rpx;
  overflow: hidden;
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

.merchant-image-container-tall {
  width: 100%;
  height: 0;
  padding-bottom: 110%;
  /* 稍高的比例 */
  position: relative;
}

.merchant-image-container-tall image {
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
  border-radius: 16rpx;
  transition: all 0.3s ease;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  min-width: 72rpx;
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

/* 优惠券横向滚动容器 */
.voucher-scroll {
  width: 100%;
  max-width: 100vw;
  /* 强制约束最大宽度 */
  overflow-x: hidden;
  /* 父容器不溢出，由 scroll-view 内部滚动 */
}

/* 优惠券卡片 */
.voucher-card {
  width: 220rpx;
  min-width: 220rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 优惠券描述文字 */
.voucher-desc-text {
  color: rgba(110, 120, 129, 0.7);
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 优惠券价值文字（划线价） */
.value-text {
  color: #1c1c1c;
  text-decoration: line-through;
}

/* 优惠券标题文字 - 单行溢出省略 */
.voucher-title-text {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 商户名称文字 - 单行溢出省略 */
.merchant-name-text {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 商户描述文字 - 单行溢出省略 */
.merchant-desc-text {
  color: rgba(110, 120, 129, 0.8);
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 边框透明度 */
.border-outline-variant-30 {
  border-color: rgba(189, 200, 209, 0.3);
}

/* 新闻日期文字 */
.news-date-text {
  color: rgba(110, 120, 129, 0.6);
}

/* 区域标签横向滚动容器 */
.area-scroll {
  width: 100%;
  max-width: 100vw;
  /* 强制约束最大宽度 */
  overflow-x: hidden;
}

/* 隐藏滚动条 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 区域徽章样式 */
.area-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  background: rgba(0, 174, 239, 0.1);
  border-radius: 12rpx;
  color: #00AEEF;
}
</style>
