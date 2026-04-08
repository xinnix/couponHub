<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { newsApi } from '@/api/business'

// 获取路由参数
const props = defineProps<{
  id: string
}>()

definePage({
  style: {
    backgroundColor: '#F5FAFF',
    navigationStyle: 'custom',
  },
})

// 状态栏高度
const statusBarHeight = ref(0)

// 状态
const loading = ref(false)
const newsDetail = ref<any>(null)

// 加载新闻详情
async function loadNewsDetail() {
  if (!props.id) {
    uni.showToast({
      title: '新闻 ID 不能为空',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    const res = await newsApi.getDetail(props.id)
    if (res.success && res.data) {
      newsDetail.value = res.data
      console.log('新闻详情:', newsDetail.value)
    }
    else {
      uni.showToast({
        title: '加载失败',
        icon: 'none',
      })
    }
  }
  catch (error) {
    console.error('加载新闻详情失败:', error)
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
  }
}

// 查看关联优惠券
function goToCoupon(couponId: string) {
  uni.navigateTo({
    url: `/pages/coupon/detail?id=${couponId}`,
  })
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 返回上一页
function goBack() {
  uni.navigateBack()
}

// 页面加载
onMounted(() => {
  // 获取系统信息，设置状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  loadNewsDetail()
})

// 分享功能
function onShareAppMessage() {
  if (!newsDetail.value)
    return {}

  return {
    title: newsDetail.value.title,
    path: `/pages/news/detail?id=${props.id}`,
    imageUrl: newsDetail.value.bannerUrl || undefined,
  }
}
</script>

<template>
  <view class="relative min-h-screen bg-surface text-on-surface font-body antialiased">
    <!-- 顶部导航栏 -->
    <view class="top-nav-bg sticky top-0 z-50 w-full flex items-center px-4 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="w-full flex items-center gap-3">
        <!-- 返回按钮 -->
        <view class="back-btn flex items-center justify-center" @click="goBack">
          <text class="iconfont icon-fanhui text-black" />
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="flex items-center justify-center py-20">
      <text class="text-on-surface-variant">
        加载中...
      </text>
    </view>

    <!-- 新闻详情 -->
    <view v-else-if="newsDetail" class="page-content">
      <!-- 新闻标题 -->
      <view class="px-6 py-6">
        <text class="text-2xl text-on-surface font-extrabold leading-tight">
          {{ newsDetail.title }}
        </text>
      </view>

      <!-- 发布时间 -->
      <view class="flex items-center justify-between px-6 pb-4">
        <text class="text-xs text-on-surface-variant font-medium">
          {{ formatDate(newsDetail.createdAt) }}
        </text>
        <!-- 阅读数 -->
        <view class="flex items-center gap-2">
          <text class="text-xs text-on-surface-variant font-medium">
            {{ newsDetail.viewCount }} 次浏览
          </text>
        </view>
      </view>

      <!-- 分割线 -->
      <view class="bg-outline-variant-30 mx-6 h-1px" />

      <!-- 新闻内容 -->
      <view class="px-6 py-6">
        <!-- 富文本内容（使用 rich-text 组件） -->
        <rich-text class="article-content text-sm text-on-surface font-medium leading-relaxed"
          :nodes="newsDetail.content" />
      </view>

      <!-- 关联优惠券（如果有） -->
      <!-- <view v-if="newsDetail.linkedCouponId" class="px-6 pb-6">
        <view class="linked-coupon-card rounded-xl p-4 shadow-ambient">
          <view class="flex items-center justify-between">
            <view>
              <text class="text-xs text-primary-container font-bold">
                相关优惠
              </text>
              <text class="mt-1 text-sm text-on-surface font-bold">
                点击查看详情
              </text>
            </view>
            <button class="rounded-lg bg-primary-container px-4 py-2 text-xs text-white font-bold"
              @click="goToCoupon(newsDetail.linkedCouponId)">
              查看优惠券
            </button>
          </view>
        </view>
      </view> -->
    </view>

    <!-- 错误状态 -->
    <view v-else class="flex flex-col items-center justify-center py-20">
      <text class="iconfont icon-empty text-6xl text-on-surface-variant opacity-30" />
      <text class="mt-4 text-sm text-on-surface-variant">
        新闻不存在或已被删除
      </text>
    </view>

    <!-- 固定底部栏 -->
    <view class="fixed-bottom-bar">
      <view class="flex items-center justify-between px-6 py-2">
        <!-- Logo -->
        <view class="logo-section">
          <image class="bottom-logo" src="/static/logo.png" mode="aspectFit" />
        </view>

        <!-- 分享按钮 -->
        <button class="share-btn" open-type="share">
          <text class="iconfont icon-icon_fenxiang text-black" />
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 页面内容区域 */
.page-content {
  position: relative;
  z-index: 10;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

/* 顶部导航栏背景 */
.top-nav-bg {
  background: rgba(245, 250, 255, 0.8);
  backdrop-filter: blur(20rpx);
}

/* 返回按钮 */
.back-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.back-btn:active {
  transform: scale(0.95);
  opacity: 0.7;
}

.back-icon {
  font-size: 36rpx;
  color: #00AEEF;
}

/* 自定义阴影效果 */
.shadow-ambient {
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
}

/* 边框透明度 */
.bg-outline-variant-30 {
  background: rgba(189, 200, 209, 0.3);
}

/* 阅读数图标 */
.icon-chakan {
  font-size: 20px;
}

/* 富文本内容样式 */
.article-content {
  word-break: break-word;
  line-height: 1.8;

  /* 可以添加更多富文本样式 */
  p {
    margin-bottom: 1em;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8rpx;
    margin: 1em 0;
  }

  h1,
  h2,
  h3 {
    font-weight: bold;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
  }
}

/* 关联优惠券卡片 */
.linked-coupon-card {
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 查看优惠券按钮 */
.linked-coupon-card button {
  transition: transform 0.2s ease;
}

.linked-coupon-card button:active {
  transform: scale(0.95);
}

/* 固定底部栏 */
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Logo 区域 */
.logo-section {
  flex: 0 0 auto;
}

/* 底部 Logo */
.bottom-logo {
  width: 240rpx;
  height: 96rpx;
}

/* 分享按钮 */
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.share-btn .iconfont {
  font-size: 24px;
}

.share-btn:active {
  transform: scale(0.9);
}

.share-btn::after {
  border: none;
}

button {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer;
}
</style>
