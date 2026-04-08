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
const activeArea = ref('all')

// 区域数据
const areas = [
  { label: '全部', value: 'all' },
  { label: 'A区', value: 'A' },
  { label: 'B区', value: 'B' },
  { label: 'C区', value: 'C' },
]

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

  // 区域过滤
  if (activeArea.value !== 'all') {
    result = result.filter(m => m.area === activeArea.value)
  }

  return result
})

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  loadMerchants()
})

async function loadMerchants() {
  try {
    loading.value = true
    const res = await merchantApi.getList({ limit: 50, status: 'ACTIVE' })
    if (res.success && res.data) {
      // 为商户添加模拟数据
      merchants.value = res.data.map(m => ({
        ...m,
        location: m.location || `${m.area || ['A', 'B', 'C'][Math.floor(Math.random() * 3)]}区${Math.floor(Math.random() * 200 + 1)}号`,
        area: m.area || ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        isOpen: m.isOpen !== undefined ? m.isOpen : Math.random() > 0.3,
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

function handleAreaChange(value: string) {
  activeArea.value = value
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
    <!-- 顶部导航栏 -->
    <view class="top-nav-bg sticky top-0 z-50 w-full flex items-center px-4 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }" />

    <!-- 主内容区域 -->
    <view class="content-wrapper">
      <!-- 搜索栏 -->
      <view class="search-section">
        <input v-model="searchKeyword" class="search-input" placeholder="搜索品牌、美食或服务..."
          placeholder-class="search-placeholder">
      </view>

      <!-- 区域选择 -->
      <view class="floor-section">
        <scroll-view scroll-x class="floor-scroll">
          <view v-for="area in areas" :key="area.value" class="area-tag"
            :class="[activeArea === area.value ? 'area-tag-active' : 'area-tag-inactive']"
            @click="handleAreaChange(area.value)">
            <text>{{ area.label }}</text>
          </view>
        </scroll-view>
      </view>

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
            <text class="merchant-name">
              {{ merchant.name }}
            </text>

            <!-- 描述 -->
            <text class="merchant-desc">
              {{ merchant.description || merchant.category }}
            </text>

            <!-- 位置 -->
            <view class="location-row">
              <text class="location-icon">
                📍
              </text>
              <text class="location-text">
                {{ merchant.location }}
              </text>
            </view>

            <!-- 底部信息栏 -->
            <view class="card-footer">
              <text class="status-badge" :class="[merchant.isOpen ? 'open' : 'closed']">
                {{ merchant.isOpen ? '营业中' : '已关门' }}
              </text>
              <view class="visit-btn">
                <text class="visit-text">
                  去看看
                </text>
                <text class="visit-arrow">
                  →
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!loading && filteredMerchants.length === 0" class="empty-state">
          <text class="empty-icon">
            🏪
          </text>
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
  background: #f5faff;
  // padding-bottom: 140rpx;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* 顶部导航栏 */
.top-nav-bg {
  background: rgba(245, 250, 255, 0.9);
  backdrop-filter: blur(20rpx);
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(23, 28, 32, 0.04);
  transition: all 0.3s ease;
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 1);
}

.back-btn .iconfont {
  font-size: 32rpx;
  color: #171c20;
}

/* 主内容区域 */
.content-wrapper {
  padding: 24rpx;
  // padding-bottom: 160rpx;
}

/* 搜索栏 */
.search-section {
  margin-bottom: 24rpx;
}

.search-input {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #171c20;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
  box-sizing: border-box;
}

.search-placeholder {
  color: #9ca3af;
  font-size: 28rpx;
}

/* 区域选择 */
.floor-section {
  margin-bottom: 32rpx;
}

.floor-scroll {
  white-space: nowrap;
}

/* 区域标签样式 */
.area-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: 24rpx;
  transition: all 0.3s ease;
  margin-right: 16rpx;
}

.area-tag text {
  font-size: 26rpx;
  font-weight: 600;
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

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6e7881;
}

/* 商户列表 */
.merchant-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 商户卡片 */
.merchant-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.03);
  display: flex;
  gap: 24rpx;
  transition: all 0.3s ease;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
  box-sizing: border-box;
}

.merchant-card:active {
  transform: scale(0.98);
  box-shadow: 0 8rpx 24rpx rgba(23, 28, 32, 0.06);
}

/* 图片区域 */
.card-image-wrapper {
  width: 200rpx;
  height: 200rpx;
  position: relative;
  flex-shrink: 0;
}

.card-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  transition: transform 0.3s ease;
}

.merchant-card:active .card-image {
  transform: scale(1.05);
}

/* 信息区域 */
.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.merchant-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #171c20;
  line-height: 1.3;
}

/* 描述 */
.merchant-desc {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.8);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 位置 */
.location-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.location-icon {
  font-size: 24rpx;
  color: #6e7881;
}

.location-text {
  font-size: 24rpx;
  color: #6e7881;
}

/* 底部信息栏 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(189, 200, 209, 0.3);
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status-badge.open {
  background: rgba(0, 174, 239, 0.1);
  color: #00AEEF;
}

.status-badge.closed {
  background: rgba(186, 26, 26, 0.1);
  color: #ba1a1a;
}

/* 去看看按钮 */
.visit-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: #00AEEF;
  border-radius: 48rpx;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 174, 239, 0.25);
}

.visit-btn:active {
  transform: scale(0.95);
}

.visit-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

.visit-arrow {
  font-size: 24rpx;
  color: #ffffff;
}

/* 空状态 */
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
  color: #9ca3af;
}

.empty-text {
  font-size: 28rpx;
  color: #6e7881;
}
</style>
