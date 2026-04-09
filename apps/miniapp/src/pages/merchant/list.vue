<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { merchantApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

definePage({
  style: {
    backgroundColor: '#F5FAFF',
    navigationStyle: 'custom',
  },
})

const statusBarHeight = ref(0)
const loading = ref(false)
const merchants = ref<any[]>([])
const searchKeyword = ref('')
const activeCategory = ref('all')
const activeArea = ref('全部')

// 滚动监听相关
const scrollTop = ref(0)
const searchBgOpacity = ref(0) // 搜索栏背景透明度（0=透明，1=白色）
const filterFixed = ref(false) // 筛选栏（分类+楼层）是否吸顶

// 高度常量（px）- 在 onMounted 中通过 uni.upx2px 转换
const HEADER_IMAGE_HEIGHT_PX = ref(160) // 背景图高度（默认值，会在 mounted 时更新）
const SEARCH_BAR_HEIGHT_PX = ref(44) // 搜索栏高度

// 计算筛选栏固定的 top 值（考虑状态栏高度）
const filterFixedTop = computed(() => {
  return `${statusBarHeight.value + 44}px` // 状态栏 + 搜索栏高度
})

// 分类数据（参考图片的分类标签）
const categories = [
  { label: '全部(138)', value: 'all' },
  { label: '餐饮美食(39)', value: '餐饮' },
  { label: '服饰鞋包(39)', value: '服装' },
  { label: '儿童', value: '儿童' },
  { label: '美容', value: '美容' },
  { label: '娱乐', value: '娱乐' },
]

// 区域数据（参考小程序首页）
const areas = ['全部', 'A区', 'B区', 'C区']

// 过滤后的商户列表
const filteredMerchants = computed(() => {
  let result = merchants.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(m =>
      m.name.toLowerCase().includes(keyword)
      || m.description?.toLowerCase().includes(keyword)
      || m.category?.toLowerCase().includes(keyword),
    )
  }

  // 分类过滤
  if (activeCategory.value !== 'all') {
    result = result.filter(m => m.category === activeCategory.value)
  }

  // 区域过滤
  if (activeArea.value !== '全部') {
    result = result.filter(m => m.area === activeArea.value)
  }

  return result
})

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  // 使用 uni.upx2px 将 rpx 转换为 px，确保单位一致
  // scrollTop 返回的是 px 值，所以需要统一使用 px
  HEADER_IMAGE_HEIGHT_PX.value = uni.upx2px(320) // 背景图高度 320rpx
  SEARCH_BAR_HEIGHT_PX.value = uni.upx2px(88) // 搜索栏高度 88rpx

  loadMerchants()
})

// 滚动监听：控制搜索栏背景透明度和筛选栏吸顶
function handleScroll(e: any) {
  const { scrollTop: currentScrollTop } = e.detail
  scrollTop.value = currentScrollTop

  // 计算搜索栏背景透明度
  const maxScroll = HEADER_IMAGE_HEIGHT_PX.value - SEARCH_BAR_HEIGHT_PX.value
  if (currentScrollTop <= 0) {
    searchBgOpacity.value = 0
  }
  else if (currentScrollTop >= maxScroll) {
    searchBgOpacity.value = 1
  }
  else {
    searchBgOpacity.value = currentScrollTop / maxScroll
  }

  // 控制筛选栏整体吸顶
  // 当筛选栏滚动到搜索栏下方时固定
  // 阈值 = 背景图高度 - 搜索栏高度
  const filterThreshold = HEADER_IMAGE_HEIGHT_PX.value - SEARCH_BAR_HEIGHT_PX.value
  filterFixed.value = currentScrollTop >= filterThreshold
}

async function loadMerchants() {
  try {
    loading.value = true
    const res = await merchantApi.getList({ limit: 50, status: 'ACTIVE' })
    if (res.success && res.data) {
      // 为商户添加模拟数据
      merchants.value = res.data.map(m => ({
        ...m,
        area: m.area || ['A区', 'B区', 'C区'][Math.floor(Math.random() * 3)],
        location: m.area ? `${m.area.replace('区', '馆')}-${Math.floor(Math.random() * 200 + 1)}号` : 'A馆-024号',
        // 添加活动标签（参考图片的"花现珠""赚现珠"）
        tags: Math.random() > 0.5 ? ['花现珠', '赚现珠'].slice(0, Math.floor(Math.random() * 2 + 1)) : [],
      }))
    }
  }
  catch (error) {
    console.error('加载商户失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function handleCategoryChange(value: string) {
  activeCategory.value = value
}

function handleAreaChange(area: string) {
  activeArea.value = area
}

function handleMerchantClick(merchant: any) {
  uni.navigateTo({
    url: `/pages/merchant/detail?id=${merchant.id}`,
  })
}

function getDefaultImage(id: string) {
  return `https://picsum.photos/seed/merchant-${id}/400/300`
}

function handleImageError(e: any) {
  e.target.src = 'https://picsum.photos/seed/default/400/300'
}
</script>

<template>
  <view class="merchant-list-page">
    <!-- 固定搜索栏（顶部） -->
    <view class="fixed-search-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <!-- 动态背景 -->
      <view class="search-bar-bg" :style="{
        opacity: searchBgOpacity,
        backgroundColor: '#F5FAFF',

      }" />

      <!-- 搜索框（左对齐） -->
      <view class="search-box-wrapper">
        <view class="search-box" :style="{
          backgroundColor: searchBgOpacity < 0.3 ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF',
          border: searchBgOpacity < 0.3 ? '2rpx solid rgba(255, 255, 255, 0.6)' : '2rpx solid rgba(189, 200, 209, 0.2)',
        }">
          <input v-model="searchKeyword" class="search-input" placeholder="请输入" placeholder-class="search-placeholder">
        </view>
      </view>
    </view>

    <!-- 滚动内容区域 -->
    <scroll-view class="scroll-content" scroll-y enable-back-to-top :scroll-top="scrollTop" @scroll="handleScroll">
      <!-- 头部背景图区域 -->
      <view class="header-image-section">
        <image class="header-bg" src="/static/merchant/list-bg.png" mode="aspectFill" />
        <view class="header-mask" />
      </view>

      <!-- 筛选栏区域（分类+区域，整体吸顶） -->
      <view class="filter-container" :class="{ 'is-fixed': filterFixed }"
        :style="filterFixed ? { top: filterFixedTop } : {}">
        <!-- 分类导航栏 -->
        <view class="category-nav">
          <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
            <view v-for="cat in categories" :key="cat.value"
              :class="[activeCategory === cat.value ? 'category-item-active' : 'category-item-inactive']"
              @click="handleCategoryChange(cat.value)">
              <text class="category-text">
                {{ cat.label }}
              </text>
            </view>
          </scroll-view>
        </view>

        <!-- 区域选择栏 -->
        <view class="area-nav">
          <scroll-view scroll-x class="area-scroll" :show-scrollbar="false">
            <view v-for="area in areas" :key="area"
              :class="[activeArea === area ? 'area-item-active' : 'area-item-inactive']"
              @click="handleAreaChange(area)">
              <text class="area-text">
                {{ area }}
              </text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 筛选栏占位元素 -->
      <view v-if="filterFixed" class="filter-placeholder" />

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">
          加载中...
        </text>
      </view>

      <!-- 商户列表 -->
      <view v-else class="merchant-list">
        <view v-for="merchant in filteredMerchants" :key="merchant.id" class="merchant-card"
          @click="handleMerchantClick(merchant)">
          <!-- 左侧图片区域 -->
          <view class="card-image-wrapper">
            <image :src="merchant.logo || getDefaultImage(merchant.id)" class="card-image" mode="aspectFill"
              @error="handleImageError" />
          </view>

          <!-- 右侧信息区域 -->
          <view class="card-info">
            <!-- 商户名称 -->
            <text class="merchant-name">
              {{ merchant.name }}
            </text>

            <!-- 商户类别 -->
            <text class="merchant-category">
              {{ merchant.category }} | {{ merchant.category }}
            </text>

            <!-- 商户地址 -->
            <text class="merchant-address">
              {{ merchant.location }}
            </text>

            <!-- 活动标签（如果有） -->
            <!-- <view v-if="merchant.tags && merchant.tags.length > 0" class="tags-row">
              <view v-for="tag in merchant.tags" :key="tag" class="activity-tag">
                <text class="tag-text">
                  {{ tag }}
                </text>
              </view>
            </view> -->
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!loading && filteredMerchants.length === 0" class="empty-state">
          <text class="iconfont icon-zanwuzichan empty-icon" />
          <text class="empty-text">
            暂无商户
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="1" />
  </view>
</template>

<style lang="scss" scoped>
.merchant-list-page {
  min-height: 100vh;
  background: #F5FAFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow: hidden;
  /* 禁止页面滚动，只允许 scroll-view 滚动 */
}

/* ===== 固定搜索栏 ===== */
.fixed-search-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  height: 88rpx;
  /* 固定高度 */
  background: transparent;
  /* 确保容器背景透明 */
  pointer-events: none;
  /* 允许点击穿透到下层 */
}

.search-bar-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  transition: all 0.3s ease;
  pointer-events: none;
  /* 移除默认背景色，完全依赖 opacity */
}

.search-box-wrapper {
  position: relative;
  z-index: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx 0 48rpx;
  /* 左侧padding 48rpx 与小程序控制按钮对齐 */
  pointer-events: auto;
  /* 恢复搜索框区域的点击 */
}

.search-box {
  width: 380rpx;
  height: 64rpx;
  border-radius: 48rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.search-input {
  width: 100%;
  height: 100%;
  font-size: 26rpx;
  color: #171c20;
}

.search-placeholder {
  color: #6e7881;
  font-size: 26rpx;
}

/* 功能按钮（右上角） */
.header-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.action-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
}

.action-icon {
  font-size: 20rpx;
  color: rgba(23, 28, 32, 0.8);
}

/* ===== 滚动内容区域 ===== */
.scroll-content {
  height: 100vh;
  overflow-y: auto;
  /* 移除paddingTop，让背景图能从顶部开始显示 */
  padding-top: 0 !important;
}

/* ===== 头部背景图区域 ===== */
.header-image-section {
  position: relative;
  width: 100%;
  height: 320rpx;
  overflow: hidden;
  /* 负margin，让背景图延伸到搜索栏下方 */
  margin-top: -88rpx;
  /* 搜索栏高度 */
  padding-top: 88rpx;
  /* 补偿padding，保持内容位置 */
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(23, 28, 32, 0.4);
}

/* ===== 筛选栏容器（分类+楼层） ===== */
.filter-container {
  position: relative;
  background: rgba(245, 250, 255, 1);
  backdrop-filter: blur(20rpx);
  transition: all 0.1s ease;
}

/* 筛选栏固定状态 */
.filter-container.is-fixed {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 2rpx 12rpx rgba(23, 28, 32, 0.08);
}

/* 筛选栏占位元素（防止固定时内容跳动） */
.filter-placeholder {
  height: 152rpx;
  /* 分类栏72rpx + 楼层栏80rpx */
}

/* ===== 分类导航栏 ===== */
.category-nav {
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid rgba(189, 200, 209, 0.15);
}

/* ===== 区域选择栏 ===== */
.area-nav {
  padding: 24rpx 24rpx 32rpx;
}

.area-scroll {
  white-space: nowrap;
}

.area-item-active,
.area-item-inactive {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 20rpx;
  border-radius: 12rpx;
  transition: all 0.3s ease;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  min-width: 72rpx;
  margin-right: 16rpx;
}

.area-item-active:first-child,
.area-item-inactive:first-child {
  margin-left: 0;
}

.area-item-active:last-child,
.area-item-inactive:last-child {
  margin-right: 0;
}

.area-text {
  font-size: 22rpx;
  font-weight: 600;
}

/* 选中状态：蓝色文字+蓝色边框，白色背景 */
.area-item-active {
  background: rgba(255, 255, 255, 0.9);
  color: #00AEEF;
  border: 2rpx solid #00AEEF;
  box-shadow: 0 4rpx 16rpx rgba(0, 174, 239, 0.15);
}

/* 未选中状态：白色背景+灰色文字+灰色边框 */
.area-item-inactive {
  background: rgba(255, 255, 255, 0.9);
  color: #6e7881;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
}

.area-item-inactive:active {
  transform: scale(0.95);
}

/* ===== 分类导航栏 ===== */
.category-nav {
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid rgba(189, 200, 209, 0.15);
}

.category-scroll {
  white-space: nowrap;
}

.category-item-active,
.category-item-inactive {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: 0;
  margin-right: 24rpx;
}

.category-text {
  font-size: 28rpx;
}

/* 选中状态：使用首页蓝色 */
.category-item-active {
  color: #00AEEF;
  font-weight: 600;
  border-bottom: 4rpx solid #00AEEF;
}

/* 未选中状态：使用首页次要文字色 */
.category-item-inactive {
  color: #6e7881;
  font-weight: 500;
}

/* ===== 商户列表 ===== */
.merchant-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 140rpx;
  /* 底部留出 TabBar 空间 */
}

/* ===== 商户卡片 ===== */
.merchant-card {
  background: rgba(255, 255, 255, 0.9);
  /* 使用首页白色卡片背景 */
  backdrop-filter: blur(20rpx);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.03);
  /* 使用首页阴影 */
  display: flex;
  gap: 24rpx;
  transition: all 0.3s ease;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
  /* 使用首页边框色 */
}

.merchant-card:active {
  transform: scale(0.98);
}

/* 图片区域 */
.card-image-wrapper {
  width: 160rpx;
  height: 160rpx;
  position: relative;
  flex-shrink: 0;
}

.card-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  object-fit: cover;
}

/* 信息区域 */
.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

/* 商户名称：黑色粗体 */
.merchant-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #171c20;
  /* 使用首页主文字色 */
  line-height: 1.3;
}

/* 商户类别：灰色小字 */
.merchant-category {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.8);
  /* 使用首页次要文字色 */
  line-height: 1.5;
}

/* 商户地址：灰色小字 */
.merchant-address {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.8);
  /* 使用首页次要文字色 */
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 活动标签行 */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}

/* 活动标签：使用首页蓝色背景 */
.activity-tag {
  background: rgba(0, 174, 239, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.tag-text {
  font-size: 22rpx;
  color: #00AEEF;
  /* 使用首页蓝色 */
  font-weight: 500;
}

/* ===== 加载状态 ===== */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6e7881;
  /* 使用首页次要文字色 */
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  color: #6e7881;
  /* 使用首页次要文字色 */
}

.empty-text {
  font-size: 28rpx;
  color: #6e7881;
  /* 使用首页次要文字色 */
}
</style>
