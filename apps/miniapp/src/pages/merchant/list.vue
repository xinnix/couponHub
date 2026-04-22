<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
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
const loadingMore = ref(false)
const loadingCategories = ref(false)
const merchants = ref<any[]>([])
const searchKeyword = ref('')
const activeCategory = ref('all')
const activeArea = ref('全部')

// 分类数据（从后端获取）
const categories = ref<Array<{ label: string, value: string, count?: number }>>([
  { label: '全部', value: 'all' },
])

// 区域数据
const areas = ['全部', 'A区', 'B区', 'C区']

// 分页状态
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const total = ref(0)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  // 加载分类和商户数据
  loadCategories()
  loadMerchants()
})

// 页面滚动到底部触发加载更多
onReachBottom(() => {
  console.log('触发页面滚动到底部，当前状态：', {
    loadingMore: loadingMore.value,
    hasMore: hasMore.value,
    currentCount: merchants.value.length,
    total: total.value,
  })
  loadMoreMerchants()
})

// 加载商户列表（首次加载或重新加载）
async function loadMerchants() {
  try {
    loading.value = true
    page.value = 1
    hasMore.value = true

    console.log('开始首次加载商户列表')

    const params = buildQueryParams()
    const res = await merchantApi.getList(params)

    console.log('API 返回的完整数据:', res)
    console.log('res.total:', res.total, 'res.page:', res.page, 'res.pageSize:', res.pageSize)

    if (res.success && res.data) {
      merchants.value = res.data.map(m => ({
        ...m,
        area: m.area || '未分配',
        location: m.area ? `${m.area.replace('区', '馆')}-${m.shopNumber || Math.floor(Math.random() * 200 + 1)}号` : '位置待定',
      }))
      total.value = res.total || 0
      hasMore.value = merchants.value.length < total.value

      console.log('首次加载完成，当前数量：', merchants.value.length, '，总数：', total.value, '，还有更多：', hasMore.value)
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

// 加载更多商户
async function loadMoreMerchants() {
  console.log('loadMoreMerchants 被调用，当前状态：', {
    loadingMore: loadingMore.value,
    hasMore: hasMore.value,
    page: page.value,
    currentCount: merchants.value.length,
    total: total.value,
  })

  if (loadingMore.value || !hasMore.value) {
    console.log('阻止加载：', loadingMore.value ? '正在加载' : '没有更多数据')
    return
  }

  try {
    loadingMore.value = true
    page.value += 1

    console.log('开始加载第', page.value, '页')

    const params = buildQueryParams()
    const res = await merchantApi.getList(params)

    if (res.success && res.data) {
      const newMerchants = res.data.map(m => ({
        ...m,
        area: m.area || '未分配',
        location: m.area ? `${m.area.replace('区', '馆')}-${m.shopNumber || Math.floor(Math.random() * 200 + 1)}号` : '位置待定',
      }))
      merchants.value = [...merchants.value, ...newMerchants]
      total.value = res.total || 0
      hasMore.value = merchants.value.length < total.value

      console.log('加载成功，当前总数：', merchants.value.length, '，是否还有更多：', hasMore.value)
    }
  }
  catch (error) {
    console.error('加载更多商户失败:', error)
    page.value -= 1 // 失败时回退页码
  }
  finally {
    loadingMore.value = false
  }
}

// 构建查询参数
function buildQueryParams() {
  const params: any = {
    page: page.value,
    limit: pageSize.value,
    status: 'ACTIVE',
  }

  // 分类筛选（非"全部"时才传）
  if (activeCategory.value !== 'all') {
    params.category = activeCategory.value
  }

  // 区域筛选（非"全部"时才传）
  if (activeArea.value !== '全部') {
    params.area = activeArea.value
  }

  // 搜索关键词
  if (searchKeyword.value) {
    params.search = searchKeyword.value
  }

  return params
}

async function loadCategories() {
  loadingCategories.value = true
  try {
    const res = await merchantApi.getCategories()
    if (res.success && res.data) {
      categories.value = [
        { label: '全部', value: 'all' },
        ...res.data.map((cat: any) => ({
          label: cat.name,
          value: cat.id,
        })),
      ]
    }
  }
  catch (error) {
    console.error('❌ 加载分类失败:', error)
    categories.value = [
      { label: '全部', value: 'all' },
    ]
  }
  finally {
    loadingCategories.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

// 分类切换
function handleCategoryChange(value: string) {
  if (activeCategory.value === value)
    return
  activeCategory.value = value
  loadMerchants()
}

// 区域切换
function handleAreaChange(area: string) {
  if (activeArea.value === area)
    return
  activeArea.value = area
  loadMerchants()
}

// 搜索
function handleSearch() {
  loadMerchants()
}

// 清空搜索
function clearSearch() {
  if (!searchKeyword.value)
    return
  searchKeyword.value = ''
  loadMerchants()
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

// 清理商户介绍中的换行符
function cleanDescription(text: string | undefined | null): string {
  if (!text)
    return ''
  return text.replace(/[\r\n]+/g, ' ').trim()
}
</script>

<template>
  <view class="merchant-list-page">
    <!-- 固定搜索栏（顶部） -->
    <view class="fixed-search-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <!-- 搜索框（左对齐） -->
      <view class="search-box-wrapper">
        <view class="search-box">
          <input v-model="searchKeyword" class="search-input" placeholder="请输入" placeholder-class="search-placeholder"
            @confirm="handleSearch">
          <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">
            ✕
          </text>
        </view>
      </view>
    </view>

    <!-- 固定筛选栏区域（分类+区域） -->
    <view class="fixed-filter-container" :style="{ top: `${statusBarHeight + 44}px` }">
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
            :class="[activeArea === area ? 'area-item-active' : 'area-item-inactive']" @click="handleAreaChange(area)">
            <text class="area-text">
              {{ area }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 页面内容区域 -->
    <view class="page-content" :style="{ paddingTop: `${statusBarHeight + 180}px` }">
      <!-- 加载状态 -->
      <view v-if="loading && merchants.length === 0" class="loading-state">
        <text class="loading-text">
          加载中...
        </text>
      </view>

      <!-- 商户列表 -->
      <view v-else class="merchant-list">
        <view v-for="merchant in merchants" :key="merchant.id" class="merchant-card"
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
              {{ merchant.category?.name || merchant.category || '未分类' }}{{ cleanDescription(merchant.description) ? ` · ${cleanDescription(merchant.description)}` : '' }}
            </text>

            <!-- 商户地址 -->
            <text class="merchant-address">
              {{ merchant.location }}
            </text>
          </view>
        </view>

        <!-- 加载更多状态 -->
        <view v-if="loadingMore" class="loading-more-state">
          <text class="loading-more-text">
            加载更多...
          </text>
        </view>

        <!-- 没有更多数据 -->
        <view v-if="!loadingMore && !hasMore && merchants.length > 0" class="no-more-state">
          <text class="no-more-text">
            没有更多商户了
          </text>
        </view>

        <!-- 空状态 -->
        <view v-if="!loading && merchants.length === 0" class="empty-state">
          <text class="iconfont icon-zanwuzichan empty-icon" />
          <text class="empty-text">
            暂无商户
          </text>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="1" />
  </view>
</template>

<style lang="scss" scoped>
.merchant-list-page {
  min-height: 100vh;
  max-width: 100vw;
  width: 100vw;
  background: #F5FAFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow-x: hidden;
  /* 强制禁止横向滚动 */
}

/* ===== 固定搜索栏 ===== */
.fixed-search-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100vw;
  max-width: 100vw;
  z-index: 999;
  height: 88rpx;
  background: #F5FAFF;
  overflow-x: hidden;
  /* 强制禁止横向滚动 */
}

.search-box-wrapper {
  position: relative;
  z-index: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx 0 48rpx;
  /* 左侧padding 48rpx 与小程序控制按钮对齐 */
}

.search-box {
  position: relative;
  width: 380rpx;
  height: 64rpx;
  border-radius: 48rpx;
  padding: 0 60rpx 0 32rpx;
  /* 右侧padding增加，为清除按钮留空间 */
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border: 2rpx solid rgba(189, 200, 209, 0.2);
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

.clear-icon {
  position: absolute;
  right: 20rpx;
  font-size: 32rpx;
  color: #6e7881;
  cursor: pointer;
}

/* ===== 固定筛选栏容器（分类+区域） ===== */
.fixed-filter-container {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100%;
  max-width: 100vw;
  background: rgba(245, 250, 255, 1);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 12rpx rgba(23, 28, 32, 0.08);
  overflow-x: hidden;
  /* 强制禁止横向滚动 */
}

/* ===== 页面内容区域 ===== */
.page-content {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  padding-bottom: 140rpx; /* 底部留出 TabBar 空间 */
  box-sizing: border-box;
  /* padding-top 通过内联样式动态设置 */
}

/* ===== 区域选择栏 ===== */
.area-nav {
  width: 100%;
  max-width: 100vw;
  padding: 24rpx 24rpx 32rpx;
  overflow-x: hidden;
  /* 禁止容器横向滚动 */
}

.area-scroll {
  width: 100%;
  max-width: 100vw;
  white-space: nowrap;
  overflow-x: auto;
  /* 只允许 scroll-view 内部横向滚动 */
  overflow-y: hidden;
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

/* 移除最后一个 item 的右边距，防止溢出 */
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
  width: 100%;
  max-width: 100vw;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid rgba(189, 200, 209, 0.15);
  overflow-x: hidden;
  /* 禁止容器横向滚动 */
}

.category-scroll {
  width: 100%;
  max-width: 100vw;
  white-space: nowrap;
  overflow-x: auto;
  /* 只允许 scroll-view 内部横向滚动 */
  overflow-y: hidden;
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

/* 移除最后一个 item 的右边距，防止溢出 */
.category-item-active:last-child,
.category-item-inactive:last-child {
  margin-right: 0;
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
  width: 100%;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 140rpx;
  /* 底部留出 TabBar 空间 */
  box-sizing: border-box;
  /* 确保 padding 不增加总宽度 */
}

/* ===== 商户卡片 ===== */
.merchant-card {
  width: 100%;
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
  box-sizing: border-box;
  /* 确保 padding 和 border 不增加宽度 */
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
  min-width: 0;
  /* 确保文本截断正常工作 */
  display: flex;
  flex-direction: column;
  gap: 8rpx;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* ===== 加载更多状态 ===== */
.loading-more-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

.loading-more-text {
  font-size: 26rpx;
  color: #6e7881;
}

/* ===== 没有更多数据 ===== */
.no-more-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 26rpx;
  color: rgba(110, 120, 129, 0.6);
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
  color: rgba(110, 120, 129, 0.4);
  /* 使用首页次要文字色，但更淡 */
}

.empty-text {
  font-size: 28rpx;
  color: #6e7881;
  /* 使用首页次要文字色 */
}
</style>
