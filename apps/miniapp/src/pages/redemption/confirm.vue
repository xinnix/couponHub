<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { redemptionApi } from '@/api/business'

interface CouponInfo {
  orderId: string
  code: string
  orderNo: string
  faceValue: number
  price: number // 用户实际支付金额
  title: string
  merchantName: string
  couponType: string
  expireDate: string
  status: string
  userNickname: string // 用户昵称
  userPhone: string // 用户手机号
  paidAt: string // 购买时间
  isFree: boolean // 是否免费券
}

const couponInfo = ref<CouponInfo | null>(null)
const confirming = ref(false)

// 计算属性
const faceValue = computed(() => couponInfo.value?.faceValue || 0)
const price = computed(() => couponInfo.value?.price || 0)
const couponTitle = computed(() => couponInfo.value?.title || '优惠券')
const merchantName = computed(() => couponInfo.value?.merchantName || '商户')
const expireDate = computed(() => couponInfo.value?.expireDate || '长期有效')
const userNickname = computed(() => couponInfo.value?.userNickname || '未知用户')
const userPhone = computed(() => couponInfo.value?.userPhone || '未绑定')
const paidAt = computed(() => couponInfo.value?.paidAt || '未知时间')
const orderNo = computed(() => couponInfo.value?.orderNo || '未知订单号')
const isFree = computed(() => couponInfo.value?.isFree || false)
// 券码只显示后4位，其余用掩码
const displayCode = computed(() => {
  const code = couponInfo.value?.code || ''
  if (code.length <= 4) return code
  const last4 = code.slice(-4)
  return `****-****-${last4}`
})
// 计算优惠幅度
const discountAmount = computed(() => {
  if (isFree.value) return '免费领取'
  const diff = faceValue.value - price.value
  if (diff > 0) return `省 ¥${diff}`
  return '无优惠'
})

onMounted(() => {
  // 从页面参数或本地存储获取优惠券信息
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.data) {
    try {
      couponInfo.value = JSON.parse(decodeURIComponent(options.data))
      console.log('核销确认 - 从URL参数接收的数据:', couponInfo.value)
    }
    catch (error) {
      console.error('解析优惠券信息失败:', error)
      uni.showToast({
        title: '数据错误',
        icon: 'none',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  }
  else {
    // 从本地存储获取
    const storedInfo = uni.getStorageSync('pendingRedemption')
    console.log('核销确认 - 从本地存储接收的数据:', storedInfo)
    if (storedInfo) {
      couponInfo.value = storedInfo
      console.log('核销确认 - 设置后的 couponInfo:', couponInfo.value)
    }
    else {
      uni.showToast({
        title: '未找到优惠券信息',
        icon: 'none',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  }
})

async function handleConfirm() {
  if (!couponInfo.value || confirming.value) {
    return
  }

  confirming.value = true

  try {
    uni.showLoading({ title: '核销中...', mask: true })

    const res = await redemptionApi.redeem({ code: couponInfo.value.code })
    const data = res.data as any

    uni.hideLoading()

    // 清除待核销信息
    uni.removeStorageSync('pendingRedemption')

    // 核销成功，显示成功提示
    uni.showToast({
      title: '核销成功',
      icon: 'success',
      duration: 2000,
    })

    // 延迟后返回核销员首页
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/handler/index' })
    }, 2000)
  }
  catch (error: any) {
    uni.hideLoading()
    confirming.value = false

    uni.showModal({
      title: '核销失败',
      content: error.message || '请稍后重试',
      showCancel: false,
    })
  }
}

function handleBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="confirm-page">
    <!-- 主内容区域 -->
    <view class="main-content">
      <!-- 优惠券卡片 -->
      <view class="coupon-card">
        <view class="coupon-decoration" />

        <!-- 左侧价值区域 -->
        <view class="coupon-value-section">
          <text class="coupon-value">
            ¥{{ faceValue }}
          </text>
          <text class="value-label">
            面值
          </text>
          <text class="discount-tag">
            {{ discountAmount }}
          </text>
        </view>

        <!-- 右侧详情区域 -->
        <view class="coupon-details">
          <!-- 商户标签 -->
          <view class="merchant-tag">
            {{ merchantName }}
          </view>
          <!-- 优惠券标题 -->
          <text class="coupon-title">
            {{ couponTitle }}
          </text>
          <!-- 有效期 -->
          <view class="expire-info">
            <text class="expire-icon">
              📅
            </text>
            <text class="expire-text">
              有效期至 {{ expireDate }}
            </text>
          </view>
        </view>

        <!-- 打孔效果 -->
        <view class="punch-hole punch-hole-left" />
        <view class="punch-hole punch-hole-right" />
      </view>

      <!-- 详细信息区域 -->
      <view class="info-section">
        <!-- 用户信息块 -->
        <view class="info-block">
          <view class="block-header">
            <text class="block-icon">
              👤
            </text>
            <text class="block-title">
              用户信息
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              用户昵称
            </text>
            <text class="info-value">
              {{ userNickname }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              手机号码
            </text>
            <text class="info-value">
              {{ userPhone }}
            </text>
          </view>
        </view>

        <!-- 订单信息块 -->
        <view class="info-block">
          <view class="block-header">
            <text class="block-icon">
              📋
            </text>
            <text class="block-title">
              订单信息
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              订单编号
            </text>
            <text class="info-value highlight">
              {{ orderNo }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              购买时间
            </text>
            <text class="info-value">
              {{ paidAt }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              实际支付
            </text>
            <text class="info-value price-value">
              {{ isFree ? '免费领取' : `¥${price}` }}
            </text>
          </view>
        </view>

        <!-- 券码信息块 -->
        <view class="info-block code-block">
          <view class="block-header">
            <text class="block-icon">
              🔐
            </text>
            <text class="block-title">
              券码信息
            </text>
          </view>
          <view class="code-display">
            <text class="code-text">
              {{ displayCode }}
            </text>
          </view>
        </view>
      </view>

      <!-- 提示文字 -->
      <view class="warning-box">
        <text class="warning-icon">
          ⚠️
        </text>
        <text class="warning-text">
          请核对以上信息后确认核销，此操作不可撤销
        </text>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="action-area">
      <button class="confirm-btn" :disabled="confirming" @click="handleConfirm">
        <text class="confirm-icon">
          ✓
        </text>
        <text class="confirm-text">
          {{ confirming ? '核销中...' : '确认核销' }}
        </text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.confirm-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5faff 0%, #e8f4ff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', sans-serif;
  padding-bottom: 200rpx;
}

/* 主内容区域 */
.main-content {
  padding: 48rpx 32rpx;
  max-width: 800rpx;
  margin: 0 auto;
}

/* 优惠券卡片 */
.coupon-card {
  position: relative;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.08);
  border: 2rpx solid rgba(189, 200, 209, 0.1);
  display: flex;
  gap: 32rpx;
  align-items: flex-start;
  overflow: hidden;
  margin-bottom: 32rpx;
}

.coupon-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 256rpx;
  height: 256rpx;
  background: rgba(0, 174, 239, 0.05);
  border-radius: 50%;
  margin-right: -128rpx;
  margin-top: -128rpx;
  filter: blur(64rpx);
}

/* 价值区域 */
.coupon-value-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 174, 239, 0.1);
  padding: 32rpx 24rpx;
  border-radius: 16rpx;
  min-width: 160rpx;
}

.coupon-value {
  font-size: 48rpx;
  font-weight: 900;
  color: #00658d;
  line-height: 1;
}

.value-label {
  font-size: 18rpx;
  font-weight: 600;
  color: rgba(0, 101, 141, 0.6);
  text-transform: uppercase;
  letter-spacing: 2rpx;
  margin-top: 8rpx;
}

.discount-tag {
  font-size: 16rpx;
  font-weight: 700;
  color: #00aeef;
  background: rgba(0, 174, 239, 0.2);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-top: 12rpx;
}

/* 详情区域 */
.coupon-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.merchant-tag {
  font-size: 18rpx;
  font-weight: 700;
  color: rgba(0, 101, 141, 0.7);
  background: rgba(0, 174, 239, 0.1);
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  display: inline-block;
}

.coupon-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #171c20;
  line-height: 1.3;
}

.expire-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.expire-icon {
  font-size: 20rpx;
}

.expire-text {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.7);
}

/* 打孔效果 */
.punch-hole {
  position: absolute;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #f5faff 0%, #e8f4ff 100%);
  top: 50%;
  transform: translateY(-50%);
}

.punch-hole-left {
  left: -16rpx;
}

.punch-hole-right {
  right: -16rpx;
}

/* 详细信息区域 */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.info-block {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.04);
  border: 1rpx solid rgba(189, 200, 209, 0.08);
}

.block-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(189, 200, 209, 0.12);
}

.block-icon {
  font-size: 24rpx;
}

.block-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #171c20;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.info-row:not(:last-child) {
  margin-bottom: 8rpx;
}

.info-label {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.6);
}

.info-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #3e4850;
}

.info-value.highlight {
  color: #00658d;
  font-weight: 700;
}

.info-value.price-value {
  color: #00aeef;
  font-weight: 800;
  font-size: 26rpx;
}

/* 券码信息块 */
.code-block {
  background: linear-gradient(135deg, #f0f8ff 0%, #e8f4ff 100%);
}

.code-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24rpx;
  background: rgba(0, 174, 239, 0.05);
  border-radius: 12rpx;
  border: 1rpx solid rgba(0, 174, 239, 0.1);
}

.code-text {
  font-size: 28rpx;
  font-weight: 700;
  color: rgba(23, 28, 32, 0.7);
  font-family: 'Courier New', monospace;
  letter-spacing: 4rpx;
}

/* 警告提示框 */
.warning-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 193, 7, 0.1);
  border: 1rpx solid rgba(255, 193, 7, 0.2);
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-top: 32rpx;
}

.warning-icon {
  font-size: 24rpx;
  flex-shrink: 0;
}

.warning-text {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.8);
  line-height: 1.5;
}

/* 底部操作按钮 */
.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(245, 250, 255, 0.9);
  backdrop-filter: blur(64rpx);
  padding: 48rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  z-index: 40;
  box-sizing: border-box;
  box-shadow: 0 -4rpx 24rpx rgba(23, 28, 32, 0.04);
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #00aeef 0%, #0095d9 100%);
  box-shadow: 0 16rpx 32rpx -8rpx rgba(0, 174, 239, 0.3);
  border-radius: 16rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  transition: all 0.2s;
  box-sizing: border-box;
}

.confirm-btn:active {
  transform: scale(0.98);
  box-shadow: 0 8rpx 16rpx -4rpx rgba(0, 174, 239, 0.3);
}

.confirm-btn[disabled] {
  opacity: 0.6;
  background: #bdc8d1;
  box-shadow: none;
}

.confirm-icon {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: 700;
}

.confirm-text {
  font-size: 26rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 4rpx;
}
</style>
