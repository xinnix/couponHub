<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { redemptionApi } from '@/api/business'

interface RedemptionRecord {
  id: string
  orderNo: string
  couponName: string
  tailNo: string
  time: string
  amount: string
  handlerName: string
  userName: string
  userPhone: string
  status: string
}

// 筛选条件
const startDate = ref('')
const endDate = ref('')
const activeFilter = ref<string>('all') // 当前激活的筛选按钮

// 数据
const records = ref<RedemptionRecord[]>([])
const loading = ref(false)
const refreshing = ref(false)

// 分页
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

// 统计数据
const stats = ref({
  totalCount: 0,
  totalFaceValue: 0, // 核销金额（面值总和）
  totalSettlement: 0, // 预估结算（结算金额总和）
})

// 获取商户信息
const handlerInfo = ref<any>(null)

// 日期格式化
function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取最近N天
function quickFilter(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  startDate.value = formatDate(start)
  endDate.value = formatDate(end)
  activeFilter.value = days === 0 ? 'today' : days === 7 ? 'week' : 'month'
  onSearch()
}

// 清空筛选
function clearFilter() {
  startDate.value = ''
  endDate.value = ''
  activeFilter.value = 'all'
  onSearch()
}

// 搜索
function onSearch() {
  page.value = 1
  hasMore.value = true
  records.value = []
  loadRecords()
}

// 加载核销记录
async function loadRecords() {
  if (loading.value || !hasMore.value)
    return

  loading.value = true

  try {
    const params: any = {
      page: page.value,
      pageSize,
    }

    if (startDate.value) {
      const start = new Date(startDate.value)
      start.setHours(0, 0, 0, 0)
      params.startDate = start.toISOString()
    }

    if (endDate.value) {
      const end = new Date(endDate.value)
      end.setHours(23, 59, 59, 999)
      params.endDate = end.toISOString()
    }

    const res = await redemptionApi.getRecords(params)

    if (res.data && Array.isArray(res.data)) {
      const newRecords = res.data.map((order: any) => {
        // 获取尾号
        const tailNo = order.orderNo.slice(-4)

        // 格式化时间
        const redeemedAt = new Date(order.redeemedAt)
        const month = (redeemedAt.getMonth() + 1).toString().padStart(2, '0')
        const day = redeemedAt.getDate().toString().padStart(2, '0')
        const hours = redeemedAt.getHours().toString().padStart(2, '0')
        const minutes = redeemedAt.getMinutes().toString().padStart(2, '0')
        const time = `${month}-${day} ${hours}:${minutes}`

        // 格式化金额：显示商户结算金额
        // settlementAmount：商户实际结算金额（补贴场景）
        // faceValue：fallback，当 settlementAmount 为空时使用
        const settlementAmount = order.template?.settlementAmount
          ? Number(order.template.settlementAmount)
          : Number(order.faceValue);
        const amount = `¥${settlementAmount.toFixed(2)}`

        // 获取核销员姓名
        const handlerName = order.handler?.name || '未知核销员'

        // 获取用户信息
        const userName = order.user?.nickname || order.user?.phone || '未知用户'
        const userPhone = order.user?.phone || ''

        return {
          id: order.id,
          orderNo: order.orderNo,
          couponName: order.template?.title || '优惠券',
          tailNo,
          time,
          amount,
          handlerName,
          userName,
          userPhone,
          status: order.status,
          // 保留原始数值用于统计
          faceValue: Number(order.faceValue), // 面值
          settlementAmount: settlementAmount, // 结算金额（已处理 fallback）
        }
      })

      if (page.value === 1) {
        records.value = newRecords
        // 计算统计数据（仅第一页时计算）
        calculateStats(newRecords)
      }
      else {
        records.value.push(...newRecords)
      }

      // 判断是否还有更多数据
      hasMore.value = newRecords.length === pageSize
    }
    else {
      hasMore.value = false
    }
  }
  catch (error) {
    console.error('加载核销记录失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
    if (refreshing.value) {
      refreshing.value = false
      uni.stopPullDownRefresh()
    }
  }
}

// 计算统计数据
function calculateStats(data: any[]) {
  stats.value.totalCount = data.length

  // 核销金额：优惠券面值总和
  stats.value.totalFaceValue = data.reduce((sum, record) => {
    return sum + (record.faceValue || 0)
  }, 0)

  // 预估结算：结算金额总和（补贴场景）
  stats.value.totalSettlement = data.reduce((sum, record) => {
    return sum + (record.settlementAmount || 0)
  }, 0)
}

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  loadRecords()
})

// 上拉加载更多
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadRecords()
  }
})

// 页面显示时刷新
onShow(() => {
  if (handlerInfo.value) {
    loadRecords()
  }
})

// 初始化
onMounted(() => {
  const storedHandlerInfo = uni.getStorageSync('handlerInfo')
  if (storedHandlerInfo) {
    handlerInfo.value = storedHandlerInfo
    loadRecords()
  }
  else {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})
</script>

<template>
  <view class="records-page">
    <!-- 顶部导航栏 -->

    <!-- 筛选区域 -->
    <view class="filter-section">
      <view class="quick-filters">
        <button class="filter-btn" :class="{ active: activeFilter === 'today' }" @click="quickFilter(0)">
          今日
        </button>
        <button class="filter-btn" :class="{ active: activeFilter === 'week' }" @click="quickFilter(7)">
          近7天
        </button>
        <button class="filter-btn" :class="{ active: activeFilter === 'month' }" @click="quickFilter(30)">
          近30天
        </button>
        <button class="filter-btn" :class="{ active: activeFilter === 'all' }" @click="clearFilter">
          全部
        </button>
      </view>

      <view class="date-filter">
        <view class="date-item">
          <text class="date-label">
            开始日期
          </text>
          <picker mode="date" :value="startDate" @change="e => startDate = e.detail.value">
            <view class="date-picker">
              {{ startDate || '选择日期' }}
            </view>
          </picker>
        </view>

        <text class="date-separator">
          至
        </text>

        <view class="date-item">
          <text class="date-label">
            结束日期
          </text>
          <picker mode="date" :value="endDate" @change="e => endDate = e.detail.value">
            <view class="date-picker">
              {{ endDate || '选择日期' }}
            </view>
          </picker>
        </view>

        <button class="search-btn" @click="onSearch">
          查询
        </button>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-section">
      <view class="stat-item">
        <text class="stat-label">
          核销数量
        </text>
        <text class="stat-value">
          {{ stats.totalCount }}
        </text>
        <text class="stat-unit">
          张
        </text>
      </view>

      <view class="stat-divider" />

      <view class="stat-item">
        <text class="stat-label">
          核销金额
        </text>
        <text class="stat-value">
          ¥{{ stats.totalFaceValue.toFixed(2) }}
        </text>
        <text class="stat-unit">
          元
        </text>
      </view>

      <view class="stat-divider" />

      <view class="stat-item">
        <text class="stat-label">
          预估结算
        </text>
        <text class="stat-value">
          ¥{{ stats.totalSettlement.toFixed(2) }}
        </text>
        <text class="stat-unit">
          元
        </text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="records-list">
      <view v-for="record in records" :key="record.id" class="record-card">
        <view class="record-header">
          <text class="record-title">
            {{ record.couponName }}
          </text>
          <text class="record-amount">
            {{ record.amount }}
          </text>
        </view>

        <view class="record-body">
          <view class="record-row">
            <text class="record-label">
              订单号
            </text>
            <text class="record-value">
              尾号 {{ record.tailNo }}
            </text>
          </view>

          <view class="record-row">
            <text class="record-label">
              用户
            </text>
            <text class="record-value">
              {{ record.userName }}
            </text>
          </view>

          <view class="record-row">
            <text class="record-label">
              核销员
            </text>
            <text class="record-value">
              {{ record.handlerName }}
            </text>
          </view>

          <view class="record-row">
            <text class="record-label">
              时间
            </text>
            <text class="record-value">
              {{ record.time }}
            </text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view v-else-if="!hasMore && records.length > 0" class="no-more-tip">
        <text>没有更多了</text>
      </view>

      <view v-else-if="!loading && records.length === 0" class="empty-tip">
        <text>暂无核销记录</text>
      </view>
    </view>

    <!-- 底部导出按钮 -->
    <!-- <view class="bottom-actions">
      <button class="export-btn" @click="exportData">
        导出数据
      </button>
    </view> -->
  </view>
</template>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f5faff;
  padding-bottom: 120rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', sans-serif;
}

/* 顶部导航栏 */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #f5faff;
}

.top-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 48rpx;
}

.back-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
}

.back-icon {
  font-size: 48rpx;
  color: #00aeef;
  font-weight: 300;
}

.page-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #171c20;
}

.spacer {
  width: 48rpx;
}

/* 筛选区域 */
.filter-section {
  background: #ffffff;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.quick-filters {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.filter-btn {
  flex: 1;
  height: 64rpx;
  background: #f5faff;
  border: 2rpx solid #e4e9ee;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #171c20;
  transition: all 0.3s ease;
}

/* 选中状态 */
.filter-btn.active {
  background: #00aeef;
  border-color: #00aeef;
  color: #ffffff;
}

.date-filter {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.date-item {
  flex: 1;
}

.date-label {
  display: block;
  font-size: 20rpx;
  color: #6e7881;
  margin-bottom: 8rpx;
}

.date-picker {
  background: #eff4fa;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #171c20;
  text-align: center;
}

.date-separator {
  font-size: 24rpx;
  color: #6e7881;
}

.search-btn {
  width: 120rpx;
  height: 60rpx;
  background: #00aeef;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

/* 统计卡片 */
.stats-section {
  background: #ffffff;
  padding: 32rpx 24rpx;
  margin: 0 24rpx 24rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-label {
  font-size: 20rpx;
  color: #6e7881;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #171c20;
}

.stat-unit {
  font-size: 20rpx;
  color: #6e7881;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: #e4e9ee;
}

/* 记录列表 */
.records-list {
  padding: 0 24rpx;
}

.record-card {
  background: #ffffff;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 20rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 2rpx solid #eff4fa;
}

.record-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #171c20;
}

.record-amount {
  font-size: 36rpx;
  font-weight: 900;
  color: #00aeef;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-label {
  font-size: 24rpx;
  color: #6e7881;
}

.record-value {
  font-size: 24rpx;
  color: #171c20;
  font-weight: 500;
}

/* 加载状态 */
.loading-tip,
.no-more-tip,
.empty-tip {
  text-align: center;
  padding: 64rpx;
  font-size: 28rpx;
  color: #6e7881;
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(245, 250, 255, 0.9);
  backdrop-filter: blur(64rpx);
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.export-btn {
  width: 100%;
  height: 88rpx;
  background: #00aeef;
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
