<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { redemptionApi } from '@/api/business'

interface CouponInfo {
  orderId: string
  code: string
  orderNo: string
  faceValue: number
  title: string
  merchantName: string
  couponType: string
  expireDate: string
  status: string
}

const couponInfo = ref<CouponInfo | null>(null)
const confirming = ref(false)

// 计算属性
const faceValue = computed(() => couponInfo.value?.faceValue || 0)
const couponTitle = computed(() => couponInfo.value?.title || '优惠券')
const merchantName = computed(() => couponInfo.value?.merchantName || '商户')
const expireDate = computed(() => couponInfo.value?.expireDate || '长期有效')
// 券码只显示后4位，其余用掩码
const displayCode = computed(() => {
  const code = couponInfo.value?.code || ''
  if (code.length <= 4) return code
  const last4 = code.slice(-4)
  return `****-****-${last4}`
})

onMounted(() => {
  // 从页面参数或本地存储获取优惠券信息
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.data) {
    try {
      couponInfo.value = JSON.parse(decodeURIComponent(options.data))
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
    if (storedInfo) {
      couponInfo.value = storedInfo
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
    <!-- 顶部导航栏 -->

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
            <text class="expire-label">
              有效期至
            </text>
            <text class="expire-date">
              {{ expireDate }}
            </text>
          </view>
        </view>

        <!-- 打孔效果 -->
        <view class="punch-hole punch-hole-left" />
        <view class="punch-hole punch-hole-right" />
      </view>

      <!-- 券码区域（弱化展示） -->
      <view class="code-section">
        <text class="code-label">
          券码
        </text>
        <text class="code-value">
          {{ displayCode }}
        </text>
      </view>

      <!-- 提示文字 -->
      <text class="instruction-text">
        请核对优惠券信息后确认核销，此操作不可撤销
      </text>
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
  background: #f5faff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', sans-serif;
  padding-bottom: 200rpx;
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
  letter-spacing: -1rpx;
}

.spacer {
  width: 48rpx;
}

.separator {
  height: 2rpx;
  width: 100%;
  background: #eff4fa;
}

/* 主内容区域 */
.main-content {
  padding: 64rpx 48rpx;
  max-width: 800rpx;
  margin: 0 auto;
}

/* 优惠券卡片 */
.coupon-card {
  position: relative;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 64rpx 48rpx;
  box-shadow: 0 16rpx 64rpx rgba(23, 28, 32, 0.04);
  border: 2rpx solid rgba(189, 200, 209, 0.1);
  display: flex;
  gap: 48rpx;
  align-items: flex-start;
  overflow: hidden;
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
  padding: 48rpx;
  border-radius: 16rpx;
  min-width: 192rpx;
}

.coupon-value {
  font-size: 64rpx;
  font-weight: 900;
  color: #00658d;
  line-height: 1;
}

.value-label {
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(0, 101, 141, 0.7);
  text-transform: uppercase;
  letter-spacing: 4rpx;
  margin-top: 16rpx;
}

/* 详情区域 */
.coupon-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.merchant-tag {
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(0, 101, 141, 0.7);
  background: rgba(0, 174, 239, 0.1);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  display: inline-block;
}

.coupon-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #171c20;
  line-height: 1.3;
}

.expire-info {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.expire-label {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.6);
}

.expire-date {
  font-size: 24rpx;
  font-weight: 700;
  color: #3e4850;
}

/* 打孔效果 */
.punch-hole {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #f5faff;
  top: 50%;
  transform: translateY(-50%);
}

.punch-hole-left {
  left: -20rpx;
}

.punch-hole-right {
  right: -20rpx;
}

/* 券码区域 */
.code-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(239, 244, 250, 0.5);
  padding: 32rpx 48rpx;
  border-radius: 16rpx;
  margin-top: 48rpx;
}

.code-label {
  font-size: 24rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.6);
}

.code-value {
  font-size: 28rpx;
  font-weight: 700;
  color: rgba(23, 28, 32, 0.6);
  font-family: 'Courier New', monospace;
  letter-spacing: 4rpx;
}

/* 提示文字 */
.instruction-text {
  display: block;
  text-align: center;
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.6);
  line-height: 1.6;
  padding: 0 64rpx;
  margin-top: 64rpx;
}

/* 底部操作按钮 */
.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(245, 250, 255, 0.8);
  backdrop-filter: blur(64rpx);
  padding: 48rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  z-index: 40;
  box-sizing: border-box;
}

.confirm-btn {
  width: 100%;
  height: 100rpx;
  background: #00aeef;
  box-shadow: 0 24rpx 48rpx -16rpx rgba(0, 174, 239, 0.4);
  border-radius: 16rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  transition: all 0.2s;
  box-sizing: border-box;
}

.confirm-btn:active {
  transform: scale(0.98);
}

.confirm-btn[disabled] {
  opacity: 0.6;
}

.confirm-icon {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 700;
}

.confirm-text {
  font-size: 28rpx;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 8rpx;
}
</style>
