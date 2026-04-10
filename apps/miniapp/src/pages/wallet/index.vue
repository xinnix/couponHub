<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref, watch } from 'vue'
import { authApi } from '@/api/auth'
import { orderApi, paymentApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

const tabs = [
  { label: '待使用', value: 'PAID' },
  { label: '已核销', value: 'REDEEMED' },
  { label: '已退款', value: 'REFUNDED' },
  { label: '已过期', value: 'EXPIRED' },
]

// 状态栏高度
const statusBarHeight = ref(0)

const isLoggedIn = ref(false)
const userInfo = ref<any>(null)
const currentTab = ref('PAID')
const loading = ref(false)
const orderList = ref<any[]>([])

// 可用券数量
const availableCount = computed(() => {
  return orderList.value.filter(o => o.status === 'PAID').length
})

// 显示的订单列表
const displayOrders = computed(() => {
  return orderList.value || []
})

// 获取面值
function getFaceValue(item: any): string {
  if (item.template && item.template.faceValue) {
    const val = Number.parseFloat(item.template.faceValue)
    return isNaN(val) ? '0' : val.toFixed(0)
  }
  return '0'
}

// 获取标题
function getTitle(item: any): string {
  if (item.template && item.template.title) {
    return item.template.title
  }
  return '未知券'
}

// 获取有效期（使用订单的 expireAt 字段）
function getExpiry(item: any): string {
  // 优先使用订单的过期时间
  if (item.expireAt) {
    const d = new Date(item.expireAt)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }
  // 兼容旧数据：使用模板的有效期
  if (item.template && item.template.validUntil) {
    const d = new Date(item.template.validUntil)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }
  return ''
}

// 获取副标题
function getSubtitle(item: any): string {
  if (item.template && item.template.description) {
    const desc = item.template.description
    return desc.length > 8 ? `${desc.slice(0, 8)}...` : desc
  }
  return '全场通用'
}

// 状态文案
function getStatusTag(item: any): string {
  const map: Record<string, string> = {
    UNPAID: '待支付',
    PAID: '待使用',
    REDEEMED: '已核销',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
    EXPIRED: '已过期',
  }
  return map[item.status] || ''
}

// 状态对应的颜色 class
function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    PAID: 'status-active',
    UNPAID: 'status-pending',
    REDEEMED: 'status-used',
    REFUNDED: 'status-refund',
    REFUNDING: 'status-refund',
    EXPIRED: 'status-expired',
  }
  return map[status] || ''
}

// 卡片是否可点击使用
function canUse(status: string): boolean {
  return status === 'PAID'
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login' })
}

function editProfile() {
  uni.navigateTo({ url: '/pages/profile/index' })
}

onMounted(async () => {
  // 获取系统信息，设置状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  const token = uni.getStorageSync('token')
  if (!token) {
    isLoggedIn.value = false
    return
  }
  isLoggedIn.value = true
  userInfo.value = uni.getStorageSync('userInfo')
  await loadOrders()
})

onShow(async () => {
  // 每次页面显示时刷新用户信息
  if (isLoggedIn.value) {
    try {
      const res = await authApi.getProfile()
      if (res.data) {
        userInfo.value = res.data
        uni.setStorageSync('userInfo', res.data)
      }
    }
    catch (error) {
      console.error('刷新用户信息失败:', error)
      // 如果失败，使用本地存储的信息
      userInfo.value = uni.getStorageSync('userInfo')
    }
  }
})

watch(currentTab, async () => {
  await loadOrders()
})

async function loadOrders() {
  try {
    loading.value = true
    const params = currentTab.value === 'ALL' ? {} : { status: currentTab.value }
    const res = await orderApi.getMyOrders(params)
    if (Array.isArray(res.data)) {
      orderList.value = res.data
    }
    else {
      orderList.value = []
    }
  }
  catch (error) {
    // 检查 token 是否存在（可能被 401 错误处理清除了）
    const token = uni.getStorageSync('token')
    if (!token) {
      // token 不存在，设置为未登录状态
      isLoggedIn.value = false
    }
  }
  finally {
    loading.value = false
  }
}

function handleCardClick(item: any) {
  if (!item || !item.id)
    return
  if (item.status === 'PAID') {
    uni.navigateTo({ url: `/pages/qrcode/index?orderId=${item.id}` })
  }
}

function handleUse(item: any) {
  uni.navigateTo({ url: `/pages/qrcode/index?orderId=${item.id}` })
}

async function handlePay(item: any) {
  try {
    uni.showLoading({ title: '调起支付...', mask: true })

    const payRes = await paymentApi.create({ orderId: item.id })
    const data = payRes.data as any
    let payParams = null
    if (data && data.payParams) {
      payParams = data.payParams
    }

    if (!payParams) {
      throw new Error('获取支付参数失败')
    }

    uni.hideLoading()

    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as 'MD5' | 'RSA',
        paySign: payParams.paySign,
        success: () => resolve(),
        fail: (err: any) => {
          let errMsg = ''
          if (err && err.errMsg) {
            errMsg = err.errMsg
          }
          if (errMsg.includes('cancel')) {
            reject(new Error('支付取消'))
          }
          else {
            reject(new Error(errMsg || '支付失败'))
          }
        },
      })
    })

    uni.showToast({ title: '支付成功', icon: 'success' })
    setTimeout(async () => {
      await loadOrders()
    }, 1500)
  }
  catch (error: any) {
    uni.hideLoading()
    const msg = (error && error.message) || '支付失败'
    uni.showToast({ title: msg, icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <view class="top-bar-bg sticky top-0 z-50 w-full flex items-center px-4 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }">
      <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
    </view>
    <!-- 顶部导航 -->
    <!-- <view class="nav-bar">
      <text class="nav-title">
        我的券包
      </text>
    </view> -->

    <!-- 未登录 -->
    <view v-if="!isLoggedIn" class="login-guide">
      <image class="login-guide-logo" src="/static/logo.png" mode="aspectFit" />
      <text class="login-guide-title">
        登录后查看券包
      </text>
      <text class="login-guide-desc">
        登录后即可查看和管理您的优惠券
      </text>
      <view class="login-guide-btn" @tap="goLogin">
        <text class="login-guide-btn-text">
          去登录
        </text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-else-if="loading" class="loading-wrap">
      <text class="loading-hint">
        加载中...
      </text>
    </view>

    <scroll-view v-else scroll-y class="content-scroll">
      <view class="content-inner">
        <!-- 用户信息卡片 -->
        <view class="user-card">
          <view class="user-info">
            <image class="user-avatar" :src="userInfo?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="user-details">
              <text class="user-name">
                {{ userInfo?.nickname || userInfo?.username || '用户' }}
              </text>
              <text v-if="userInfo?.phone" class="user-phone">
                {{ userInfo.phone }}
              </text>
              <text v-else class="user-phone placeholder">
                未绑定手机号
              </text>
            </view>
          </view>
          <view class="user-actions">
            <view class="action-btn" @tap="editProfile">
              <text class="iconfont icon-xiugai action-icon" />
            </view>
          </view>
        </view>

        <!-- 汇总卡片 -->
        <!-- <view class="summary-card">
          <text class="summary-label">
            当前可用优惠券
          </text>
          <view class="summary-value-row">
            <text class="summary-num">
              {{ availableCount }}
            </text>
            <text class="summary-unit">
              张可用
            </text>
          </view>
        </view> -->

        <!-- 筛选标签栏 -->
        <scroll-view scroll-x class="filter-scroll">
          <view class="filter-bar">
            <view v-for="tab in tabs" :key="tab.value" class="filter-tab"
              :class="{ 'filter-tab-active': currentTab === tab.value }" @click="currentTab = tab.value">
              <text class="filter-tab-text" :class="{ 'filter-tab-text-active': currentTab === tab.value }">
                {{ tab.label }}
              </text>
            </view>
          </view>
        </scroll-view>

        <!-- 优惠券列表 -->
        <view v-if="displayOrders.length > 0" class="coupon-list">
          <view v-for="item in displayOrders" :key="item.id" class="coupon-card"
            :class="{ 'coupon-card-disabled': !canUse(item.status) }" @click="handleCardClick(item)">
            <!-- 左侧金额区域 -->
            <view class="coupon-left">
              <view class="coupon-amount">
                <text class="amount-sym">
                  ¥
                </text>
                <text class="amount-num">
                  {{ getFaceValue(item) }}
                </text>
              </view>
              <text class="coupon-sub">
                {{ getSubtitle(item) }}
              </text>
            </view>

            <!-- 虚线分隔 -->
            <view class="coupon-divider" />

            <!-- 右侧信息区域 -->
            <view class="coupon-right">
              <view class="coupon-header">
                <text class="coupon-title">
                  {{ getTitle(item) }}
                </text>
                <view class="coupon-status" :class="getStatusClass(item.status)">
                  <text class="status-text">
                    {{ getStatusTag(item) }}
                  </text>
                </view>
              </view>
              <text class="coupon-expiry">
                有效期至 {{ getExpiry(item) }}
              </text>
              <view class="coupon-actions">
                <view v-if="item.status === 'PAID'" class="use-btn" @click.stop="handleUse(item)">
                  <text class="use-btn-text">
                    立即使用
                  </text>
                </view>
                <view v-if="item.status === 'UNPAID'" class="use-btn use-btn-outline" @click.stop="handlePay(item)">
                  <text class="use-btn-text use-btn-text-outline">
                    去支付
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="empty-wrap">
          <text class="iconfont icon-youhuiquan empty-icon" />
          <text class="empty-text">
            暂无优惠券
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="3" />
  </view>
</template>

<style scoped>
/* ========== 页面 ========== */
.page {
  min-height: 100vh;
  background: #f5faff;
  display: flex;
  flex-direction: column;
}

/* ========== 顶部栏背景 ========== */
.top-bar-bg {
  background: rgba(245, 250, 255, 0.9);
}

/* ========== Logo 图片 ========== */
.logo-image {
  width: 200rpx;
  height: 80rpx;
}

/* ========== 导航栏 ========== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  padding-top: env(safe-area-inset-top);
  background: rgba(245, 250, 255, 0.85);
  backdrop-filter: blur(20px);
}

.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #171c20;
}

/* ========== 用户信息卡片 ========== */
.user-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(221, 244, 255, 0.3);
  border: 2rpx solid rgba(189, 200, 209, 0.3);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #171c20;
}

.user-phone {
  font-size: 24rpx;
  color: #6e7881;
  letter-spacing: 1rpx;
}

.user-phone.placeholder {
  color: rgba(110, 120, 129, 0.6);
}

.user-actions {
  display: flex;
  align-items: center;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(221, 244, 255, 0.3);
  border-radius: 50%;
}

.action-btn:active {
  background: rgba(221, 244, 255, 0.5);
}

.action-icon {
  font-size: 32rpx;
  color: #00AEEF;
}

/* ========== 未登录引导 ========== */
.login-guide {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 0 80rpx;
}

.login-guide-logo {
  width: 200rpx;
  height: 80rpx;
  margin-bottom: 24rpx;
}

.login-guide-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #171c20;
}

.login-guide-desc {
  font-size: 26rpx;
  color: #6e7881;
  margin-bottom: 40rpx;
}

.login-guide-btn {
  width: 100%;
  height: 88rpx;
  background: #00AEEF;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 174, 239, 0.25);
}

.login-guide-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.login-guide-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

/* ========== 加载 ========== */
.loading-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-hint {
  font-size: 28rpx;
  color: #6e7881;
}

/* ========== 内容区域 ========== */
.content-scroll {
  flex: 1;
}

.content-inner {
  padding: 32rpx 32rpx 200rpx;
  max-width: 900rpx;
  margin: 0 auto;
}

/* ========== 汇总卡片 ========== */
.summary-card {
  position: relative;
  overflow: hidden;
  background: rgba(221, 244, 255, 0.3);
  border: 2rpx solid rgba(0, 174, 239, 0.05);
  border-radius: 24rpx;
  padding: 56rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 36rpx;
}

.summary-label {
  font-size: 20rpx;
  font-weight: 700;
  color: #00AEEF;
  letter-spacing: 4rpx;
  text-transform: uppercase;
}

.summary-value-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.summary-num {
  font-size: 72rpx;
  font-weight: 800;
  color: #00354a;
  letter-spacing: -2rpx;
}

.summary-unit {
  font-size: 32rpx;
  font-weight: 600;
  color: rgba(0, 53, 74, 0.8);
}

/* ========== 筛选标签栏 ========== */
.filter-scroll {
  margin-bottom: 32rpx;
  white-space: nowrap;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.filter-tab {
  flex-shrink: 0;
  padding: 14rpx 36rpx;
  border-radius: 16rpx;
  background: #e4e9ee;
  border: 2rpx solid rgba(189, 200, 209, 0.3);
}

.filter-tab-active {
  background: #00AEEF;
  border-color: #00AEEF;
  /* box-shadow: 0 8rpx 24rpx rgba(0, 174, 239, 0.2); */
}

.filter-tab-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #3e4850;
}

.filter-tab-text-active {
  color: #ffffff;
}

/* ========== 优惠券列表 ========== */
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* ========== 优惠券卡片 ========== */
.coupon-card {
  display: flex;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx 0 rgba(23, 28, 32, 0.04);
  overflow: hidden;
  min-height: 200rpx;
}

.coupon-card-disabled {
  opacity: 0.7;
}

/* 左侧金额区域 */
.coupon-left {
  width: 30%;
  flex-shrink: 0;
  background: rgba(221, 244, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 16rpx;
}

.coupon-amount {
  display: flex;
  align-items: baseline;
  color: #00AEEF;
}

.amount-sym {
  font-size: 28rpx;
  font-weight: 700;
}

.amount-num {
  font-size: 64rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
}

.coupon-sub {
  font-size: 18rpx;
  font-weight: 700;
  color: rgba(0, 174, 239, 0.7);
  letter-spacing: 2rpx;
  text-transform: uppercase;
  margin-top: 8rpx;
}

/* 虚线分隔 */
.coupon-divider {
  width: 2rpx;
  background-image: radial-gradient(#bdc8d1 2rpx, transparent 2rpx);
  background-size: 2rpx 16rpx;
  background-repeat: repeat-y;
  flex-shrink: 0;
}

/* 右侧信息区域 */
.coupon-right {
  flex: 1;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.coupon-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #171c20;
  flex: 1;
  margin-right: 16rpx;
}

.coupon-status {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.status-text {
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.status-active {
  background: rgba(0, 174, 239, 0.1);
}

.status-active .status-text {
  color: #00AEEF;
}

.status-pending {
  background: rgba(141, 79, 0, 0.1);
}

.status-pending .status-text {
  color: #8d4f00;
}

.status-used {
  background: rgba(110, 120, 129, 0.1);
}

.status-used .status-text {
  color: #6e7881;
}

.status-refund {
  background: rgba(186, 26, 26, 0.1);
}

.status-refund .status-text {
  color: #ba1a1a;
}

.status-expired {
  background: rgba(110, 120, 129, 0.1);
}

.status-expired .status-text {
  color: #6e7881;
}

.coupon-expiry {
  font-size: 22rpx;
  color: #6e7881;
  margin-top: 12rpx;
  opacity: 0.7;
}

.coupon-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
}

.use-btn {
  padding: 14rpx 36rpx;
  background: #00AEEF;
  border-radius: 12rpx;
}

.use-btn:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.use-btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.use-btn-outline {
  background: transparent;
  border: 2rpx solid #00AEEF;
}

.use-btn-text-outline {
  color: #00AEEF;
}

/* ========== 空状态 ========== */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
  color: #bdc8d1;
}

.empty-text {
  font-size: 28rpx;
  color: #6e7881;
}
</style>
