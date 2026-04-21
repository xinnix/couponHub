<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { newsApi } from '@/api/business'

// 新闻 ID（改为 ref，支持 scene 参数）
const newsId = ref<string>('')

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

// 解析富文本内容，提取图片并支持长按识别
interface ContentBlock {
  type: 'text' | 'image'
  content?: string
  imageUrl?: string
}

const contentBlocks = ref<ContentBlock[]>([])

// 解析富文本内容为内容块数组
function parseContentToBlocks(content: string): ContentBlock[] {
  if (!content) return []

  const blocks: ContentBlock[] = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let lastIndex = 0
  let match

  // 提取所有图片标签
  while ((match = imgRegex.exec(content)) !== null) {
    // 添加图片前的文本内容
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index)
      if (textContent.trim()) {
        blocks.push({
          type: 'text',
          content: textContent,
        })
      }
    }

    // 添加图片块
    blocks.push({
      type: 'image',
      imageUrl: match[1],
    })

    lastIndex = match.index + match[0].length
  }

  // 添加最后剩余的文本内容
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex)
    if (textContent.trim()) {
      blocks.push({
        type: 'text',
        content: textContent,
      })
    }
  }

  return blocks
}

// 处理富文本内容，解析为内容块
function processContent(content: string): void {
  if (!content) {
    contentBlocks.value = []
    return
  }

  // 解析为内容块
  contentBlocks.value = parseContentToBlocks(content)
}

// 加载新闻详情
async function loadNewsDetail() {
  if (!newsId.value) {
    uni.showToast({
      title: '新闻 ID 不能为空',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    const res = await newsApi.getDetail(newsId.value)
    if (res.success && res.data) {
      newsDetail.value = res.data
      // 处理富文本内容，解析为内容块
      processContent(res.data.content)
      console.log('新闻详情:', newsDetail.value)
      console.log('内容块:', contentBlocks.value)
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

// 返回上一页或首页
function goBack() {
  // 获取当前页面栈
  const pages = getCurrentPages()

  // 如果页面栈只有当前页面（从分享卡片进入），跳转到首页
  if (pages.length <= 1) {
    uni.reLaunch({
      url: '/pages/home/index',
    })
  } else {
    // 正常返回上一页
    uni.navigateBack()
  }
}

// 图片长按识别功能说明
// 使用 show-menu-by-longpress 属性，微信小程序会自动弹出操作菜单
// 支持：识别小程序码、保存图片、转发等操作
// 注意：普通网址二维码可能需要保存后手动扫码识别

// 页面加载（支持 scene 参数）
onLoad((options: any) => {
  let id = ''

  // 从普通参数获取
  if (options && options.id) {
    id = options.id
  }

  // 从 scene 参数获取（扫码进入）
  if (options && options.scene) {
    const scene = decodeURIComponent(options.scene)
    id = scene
  }

  if (id) {
    newsId.value = id
    loadNewsDetail()
  } else {
    loading.value = false
    uni.showToast({ title: '参数错误', icon: 'none' })
  }
})

// 页面初始化
onMounted(() => {
  // 获取系统信息，设置状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  // 不在这里调用 loadNewsDetail，由 onLoad 触发
})

// 分享功能
function onShareAppMessage() {
  if (!newsDetail.value)
    return {}

  return {
    title: newsDetail.value.title,
    path: `/pages/news/detail?id=${newsId.value}`,
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
        <!-- 渲染内容块 -->
        <view v-for="(block, index) in contentBlocks" :key="index" class="content-block">
          <!-- 文本内容 -->
          <rich-text v-if="block.type === 'text'" class="article-content text-sm text-on-surface font-medium leading-relaxed"
            :nodes="block.content" />

          <!-- 图片内容（支持长按识别） -->
          <image v-else-if="block.type === 'image'" class="content-image" :src="block.imageUrl" mode="widthFix"
            :show-menu-by-longpress="true" />
        </view>
      </view>

      <!-- 关联优惠券列表（如果有） -->
      <view v-if="newsDetail.coupons && newsDetail.coupons.length > 0" class="px-6 pb-6">
        <view class="mb-4">
          <text class="text-sm text-on-surface font-bold">
            相关优惠
          </text>
        </view>

        <!-- 优惠券卡片列表 -->
        <view class="space-y-3">
          <view v-for="(item, index) in newsDetail.coupons" :key="item.id"
            class="coupon-card rounded-xl p-4 shadow-ambient">
            <view class="flex items-center justify-between">
              <!-- 左侧信息 -->
              <view class="flex-1">
                <text class="mb-2 block text-sm text-on-surface font-bold">
                  {{ item.coupon.title }}
                </text>

                <!-- 价格信息 -->
                <view class="mb-2 flex items-center gap-2">
                  <text class="text-lg text-primary-container font-bold">
                    ¥{{ item.coupon.buyPrice }}
                  </text>
                  <text class="text-xs text-on-surface-variant line-through">
                    面值 ¥{{ item.coupon.faceValue }}
                  </text>
                </view>

                <!-- 优惠券简介 -->
                <text v-if="item.coupon.description" class="block text-xs text-on-surface-variant">
                  {{ item.coupon.description }}
                </text>
              </view>

              <!-- 右侧按钮 -->
              <view
                class="buy-btn rounded-md bg-primary-container px-4 py-1.5 text-xs text-white font-bold transition-transform"
                @click="goToCoupon(item.coupon.id)">
                立即抢
              </view>
            </view>
          </view>
        </view>
      </view>
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
}

/* 注意：小程序不支持标签选择器，富文本内容样式依赖 HTML 自带样式 */

/* 内容块样式 */
.content-block {
  margin-bottom: 0;
}

/* 图片样式 */
.content-image {
  width: 100%;
  max-width: 100%;
  display: block;
  border-radius: 8rpx;
  margin: 1em 0;
}

/* 关联优惠券卡片 */
.linked-coupon-card {
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 多优惠券卡片样式 */
.coupon-card {
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
  transition: all 0.2s ease;
}

/* 立即抢按钮 - 参考首页样式 */
.buy-btn {
  transition: transform 0.2s ease;
  box-shadow: none;
}

.buy-btn:active {
  transform: scale(0.95);
}

/* 删除线样式 */
.line-through {
  text-decoration: line-through;
}

/* 空优惠券卡片 */
.empty-coupon-card {
  background: rgba(255, 255, 255, 0.6);
  border: 2rpx solid rgba(189, 200, 209, 0.3);
}

/* 优惠券卡片间距（不使用通配符选择器） */
.coupon-card+.coupon-card {
  margin-top: 0.75rem;
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
