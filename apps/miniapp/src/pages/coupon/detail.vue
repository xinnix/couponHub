<script setup lang="ts">
import { computed, ref } from 'vue'
import { couponApi, orderApi, paymentApi } from '@/api/business'

const loading = ref(true)
const coupon = ref<any>(null)
const buying = ref(false)
const statusBarHeight = ref(0)

// 计算属性 - 显示数据
const displayTitle = computed(() => {
  if (coupon.value && coupon.value.title) {
    return coupon.value.title
  }
  return ''
})

const displayBuyPrice = computed(() => {
  if (coupon.value && coupon.value.buyPrice) {
    const price = Number.parseFloat(coupon.value.buyPrice)
    return isNaN(price) ? 0 : price
  }
  return 0
})

const displayFaceValue = computed(() => {
  if (coupon.value && coupon.value.faceValue) {
    const value = Number.parseFloat(coupon.value.faceValue)
    return isNaN(value) ? 0 : value
  }
  return 0
})

const displayStock = computed(() => {
  if (coupon.value && coupon.value.stock !== undefined) {
    const stock = Number.parseInt(coupon.value.stock)
    return isNaN(stock) ? 0 : stock
  }
  return 0
})

const displayValidFrom = computed(() => {
  if (coupon.value && coupon.value.validFrom) {
    return coupon.value.validFrom
  }
  return ''
})

const displayValidUntil = computed(() => {
  if (coupon.value && coupon.value.validUntil) {
    return coupon.value.validUntil
  }
  return ''
})

const displayDescription = computed(() => {
  if (coupon.value && coupon.value.description) {
    return coupon.value.description
  }
  return '在商户门店尽享专属优惠。本券适用于店内所有商品，包括季节新品及精选配饰。'
})

const displayMerchantName = computed(() => {
  if (coupon.value && coupon.value.merchant && coupon.value.merchant.name) {
    return coupon.value.merchant.name
  }
  return '商户门店'
})

const displayButtonText = computed(() => {
  if (buying.value) {
    return '处理中...'
  }
  if (!coupon.value || displayStock.value <= 0) {
    return '已售罄'
  }

  // 新增：根据价格显示不同文案
  if (displayBuyPrice.value === 0) {
    return '立即领取'
  }

  return '立即购买'
})

const isButtonDisabled = computed(() => {
  return buying.value || !coupon.value || displayStock.value <= 0
})

const discountPercent = computed(() => {
  if (displayFaceValue.value > 0 && displayBuyPrice.value > 0) {
    const discount = ((displayFaceValue.value - displayBuyPrice.value) / displayFaceValue.value * 100).toFixed(0)
    return discount
  }
  return '50'
})

// 库存文案
const stockText = computed(() => {
  const stock = displayStock.value
  if (stock <= 0)
    return '已售罄'
  if (stock <= 10)
    return `仅剩${stock}张`
  return `剩余${stock}张`
})

// 库存颜色
const stockColor = computed(() => {
  const stock = displayStock.value
  if (stock <= 0)
    return '#ba1a1a'
  if (stock <= 10)
    return '#8d4f00'
  return '#3a637c'
})

// 每人限领文案
const claimLimitText = computed(() => {
  if (!coupon.value)
    return ''

  const claimLimit = coupon.value.claimLimit

  // null 或 undefined 表示无限制
  if (claimLimit === null || claimLimit === undefined) {
    return '不限购'
  }

  const limit = Number.parseInt(claimLimit)
  if (isNaN(limit) || limit <= 0) {
    return '不限购'
  }

  return `每人限领${limit}张`
})

// 购买截止日期
const displayEndTime = computed(() => {
  if (coupon.value && coupon.value.validUntil) {
    return formatDate(coupon.value.validUntil)
  }
  return '长期有效'
})

// 有效天数
const displayValidDays = computed(() => {
  if (coupon.value && coupon.value.validDays) {
    return coupon.value.validDays
  }
  return 30 // 默认30天
})

// 格式化价格函数
function formatPrice(price: number): string {
  return price.toFixed(2)
}

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  let couponId = ''

  // 从普通参数获取
  if (options && options.id) {
    couponId = options.id
  }

  // 从 scene 参数获取（扫码进入）
  if (options && options.scene) {
    const scene = decodeURIComponent(options.scene)
    couponId = scene
  }

  if (couponId) {
    await loadCoupon(couponId)
  }
  else {
    loading.value = false
    uni.showToast({ title: '参数错误', icon: 'none' })
  }
})

async function loadCoupon(id: string) {
  try {
    loading.value = true
    const res = await couponApi.getDetail(id)
    coupon.value = res.data
  }
  catch (error) {
    console.error('加载失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function handleBuy() {
  if (buying.value)
    return
  if (!coupon.value)
    return

  // ✅ 先检查登录状态
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showModal({
      title: '请先登录',
      content: '您尚未登录，无法领取或购买优惠券。是否立即登录？',
      confirmText: '立即登录',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login' })
        }
      },
    })
    return
  }

  // 检查库存
  const stockNum = Number.parseInt(coupon.value.stock) || 0
  if (stockNum <= 0) {
    uni.showToast({ title: '库存不足', icon: 'none' })
    return
  }

  const buyPriceNum = Number.parseFloat(coupon.value.buyPrice) || 0

  // 新增：根据价格分流
  if (buyPriceNum === 0) {
    await handleFreeClaim() // 免费领取流程
  }
  else {
    await handlePaidPurchase() // 付费购买流程（保持原有逻辑）
  }
}

// 新增：免费领取处理函数
async function handleFreeClaim() {
  try {
    buying.value = true
    uni.showLoading({ title: '领取中...', mask: true })

    // 1. 创建订单
    const orderRes = await orderApi.create({ templateId: coupon.value.id })
    const orderData = orderRes.data as any

    // 2. 检查是否需要支付
    if (orderData && orderData.needPayment === false) {
      // 免费券已自动 PAID，直接跳转券包
      uni.hideLoading()
      uni.showToast({ title: '领取成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/wallet/index' })
      }, 1000)
    }
    else {
      // 异常：价格 0 但后端标记需要支付
      uni.hideLoading()
      uni.showToast({ title: '系统异常，请联系客服', icon: 'none' })
    }
  }
  catch (error: any) {
    uni.hideLoading()

    // ✅ 特殊处理 401 未登录错误
    if (error.statusCode === 401 || error.message?.includes('No auth token')) {
      uni.showModal({
        title: '请先登录',
        content: '您尚未登录，无法领取优惠券。是否立即登录？',
        confirmText: '立即登录',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/login' })
          }
        },
      })
      return
    }

    // 处理领取上限错误
    let errorMsg = '领取失败'
    if (error.message) {
      errorMsg = error.message
      // 特殊处理领取上限错误
      if (errorMsg.includes('每人限领')) {
        uni.showModal({
          title: '领取限制',
          content: errorMsg,
          showCancel: false,
        })
        return
      }
    }

    uni.showToast({ title: errorMsg, icon: 'none' })
  }
  finally {
    buying.value = false
  }
}

// 付费购买处理函数（保持原有逻辑）
async function handlePaidPurchase() {
  const buyPriceNum = Number.parseFloat(coupon.value.buyPrice) || 0
  const faceValueNum = Number.parseFloat(coupon.value.faceValue) || 0

  // 确认购买
  await new Promise<void>((resolve) => {
    uni.showModal({
      title: '确认购买',
      content: `${coupon.value!.title}\n价格：¥${formatPrice(buyPriceNum)}\n面值：¥${formatPrice(faceValueNum)}`,
      confirmText: '确认支付',
      success: (res) => {
        if (res.confirm)
          resolve()
      },
    })
  })

  try {
    buying.value = true
    uni.showLoading({ title: '下单中...', mask: true })

    // 1. 创建订单
    const orderRes = await orderApi.create({ templateId: coupon.value!.id })
    const orderData = orderRes.data as any
    let orderId = ''
    if (orderData && orderData.order && orderData.order.id) {
      orderId = orderData.order.id
    }
    if (!orderId) {
      throw new Error('创建订单失败')
    }

    // 2. 创建支付，获取微信支付参数
    uni.showLoading({ title: '调起支付...', mask: true })
    const payRes = await paymentApi.create({ orderId })
    const payParams = payRes.data as any
    let paymentParams = null
    if (payParams && payParams.payParams) {
      paymentParams = payParams.payParams
    }

    if (!paymentParams) {
      throw new Error('获取支付参数失败')
    }

    uni.hideLoading()

    // 3. 调起微信支付
    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType as 'MD5' | 'RSA',
        paySign: paymentParams.paySign,
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
            const errorMsg = errMsg || '支付失败'
            reject(new Error(errorMsg))
          }
        },
      })
    })

    // 4. 支付成功，跳转到券包
    uni.showToast({ title: '支付成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/wallet/index' })
    }, 1000)
  }
  catch (error: any) {
    uni.hideLoading()

    // ✅ 特殊处理 401 未登录错误
    if (error.statusCode === 401 || error.message?.includes('No auth token')) {
      uni.showModal({
        title: '请先登录',
        content: '您尚未登录，无法购买优惠券。是否立即登录？',
        confirmText: '立即登录',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/login' })
          }
        },
      })
      return
    }

    // 处理领取上限错误
    let errorMsg = '购买失败'
    if (error.message) {
      errorMsg = error.message
      if (errorMsg.includes('每人限领')) {
        uni.showModal({
          title: '购买限制',
          content: errorMsg,
          showCancel: false,
        })
        return
      }
    }

    uni.showToast({ title: errorMsg, icon: 'none' })
  }
  finally {
    buying.value = false
  }
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// 跳转到商户详情
function goToMerchant(merchantId?: string) {
  if (!merchantId) {
    return
  }
  uni.navigateTo({
    url: `/pages/merchant/detail?id=${merchantId}`,
  })
}
</script>

<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-hint">
        加载中...
      </text>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="content-scroll">
      <view class="content-inner">
        <!-- 标题与价格区域 -->
        <view class="pricing-section">
          <!-- 限时特惠标签 -->
          <view class="offer-tag">
            <text class="iconfont icon-youhuiquan tag-icon-font" />
            <text class="tag-label">
              限时特惠
            </text>
          </view>

          <!-- 标题 -->
          <text class="title">
            {{ displayTitle }}
          </text>

          <!-- 描述 -->
          <text class="desc">
            {{ displayDescription }}
          </text>

          <!-- 价格行 -->
          <view class="price-row">
            <view class="price-main">
              <!-- 新增：免费券显示"免费"文案 -->
              <text v-if="displayBuyPrice === 0" class="price-free">
                免费
              </text>
              <text v-else class="price-now">
                ¥{{ formatPrice(displayBuyPrice) }}
              </text>
              <text class="price-old">
                ¥{{ formatPrice(displayFaceValue) }}
              </text>
            </view>
          </view>

          <!-- 标签行：折扣 + 库存 + 限领 -->
          <view class="badge-row">
            <view class="badge badge-primary">
              <text class="badge-text badge-text-primary">
                立省 {{ discountPercent }}%
              </text>
            </view>
            <view class="badge badge-stock">
              <text class="iconfont icon-youhuiquan badge-icon-font" />
              <text class="badge-text" :style="{ color: stockColor }">
                {{ stockText }}
              </text>
            </view>
            <view v-if="claimLimitText" class="badge badge-limit">
              <text class="iconfont icon-youhuiquan badge-icon-font" />
              <text class="badge-text badge-text-limit">
                {{ claimLimitText }}
              </text>
            </view>
          </view>

          <!-- 使用期 -->
          <view class="deadline-row">
            <text class="iconfont icon-youhuiquan deadline-icon-font" />
            <text class="deadline-text">
              可在 {{ formatDate(coupon?.useFrom) }} 至 {{ formatDate(coupon?.useUntil) }} 之间使用
            </text>
          </view>
        </view>

        <!-- 购买须知 -->
        <view class="rules-section">
          <view class="rules-header">
            <view class="rules-bar" />
            <text class="rules-title">
              购买须知
            </text>
          </view>

          <view class="rules-list">
            <!-- 有效期 -->
            <view class="rule-item">
              <view class="rule-icon-box">
                <text class="iconfont icon-youhuiquan rule-icon-font" />
              </view>
              <view class="rule-body">
                <text class="rule-label">
                  有效期
                </text>
                <text class="rule-desc">
                  {{ coupon?.validDays
                    ? `购买后${coupon.validDays}天内有效（不超过使用截止时间）`
                    : `在规定使用期内有效`
                  }}
                </text>
              </view>
            </view>

            <!-- 使用规则 -->
            <view class="rule-item">
              <view class="rule-icon-box">
                <text class="iconfont icon-youhuiquan rule-icon-font" />
              </view>
              <view class="rule-body">
                <text class="rule-label">
                  使用规则
                </text>
                <text class="rule-desc">
                  仅限 {{ displayMerchantName }} 门店使用
                </text>
              </view>
            </view>

            <!-- 叠加规则 -->
            <view class="rule-item">
              <view class="rule-icon-box">
                <text class="iconfont icon-youhuiquan rule-icon-font" />
              </view>
              <view class="rule-body">
                <text class="rule-label">
                  叠加规则
                </text>
                <text class="rule-desc">
                  不与其他优惠活动同时使用，每单限用一张
                </text>
              </view>
            </view>

            <!-- 退改规则 -->
            <view class="rule-item">
              <view class="rule-icon-box">
                <text class="iconfont icon-youhuiquan rule-icon-font" />
              </view>
              <view class="rule-body">
                <text class="rule-label">
                  退改规则
                </text>
                <text class="rule-desc">
                  未核销前支持随时退款
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 适用商户 -->
        <view v-if="coupon?.merchants && coupon.merchants.length > 0" class="merchant-section">
          <view class="merchant-header">
            <view class="merchant-bar" />
            <text class="merchant-title">
              适用商户（{{ coupon.merchants.length }}家）
            </text>
          </view>

          <view class="merchant-grid">
            <view v-for="merchant in coupon.merchants" :key="merchant.id" class="merchant-card"
              @click="goToMerchant(merchant.id)">
              <!-- 商户 Logo（头像式圆角方形） -->
              <view v-if="merchant.logo" class="merchant-avatar-box">
                <image class="merchant-avatar" :src="merchant.logo" mode="aspectFill" />
              </view>
              <view v-else class="merchant-avatar-placeholder">
                <text class="iconfont icon-youhuiquan merchant-avatar-icon" />
              </view>

              <!-- 商户名称 -->
              <text class="merchant-card-name">
                {{ merchant.name }}
              </text>
            </view>
          </view>
        </view>

        <!-- 底部保障区域 -->
        <!-- <view class="trust-row">
          <view class="trust-card trust-card-primary">
            <text class="iconfont icon-youhuiquan trust-icon-font" />
            <text class="trust-label">
              平台保障
            </text>
          </view>
          <view class="trust-card trust-card-gray">
            <text class="trust-card-sub">
              推荐方
            </text>
            <text class="trust-card-name">
              社区商圈
            </text>
          </view>
        </view> -->
      </view>
    </scroll-view>

    <!-- 底部购买栏 -->
    <view class="bottom-bar">
      <view class="bar-price">
        <!-- 新增：免费券不显示价格 -->
        <text v-if="displayBuyPrice === 0" class="bar-price-free">
          免费
        </text>
        <text v-else>
          <text class="bar-price-sym">
            ¥
          </text>
          <text class="bar-price-num">
            {{ formatPrice(displayBuyPrice) }}
          </text>
        </text>
      </view>
      <view class="bar-btn" :class="{ 'bar-btn-disabled': isButtonDisabled }" @click="handleBuy">
        <text class="iconfont icon-youhuiquan bar-btn-icon-font" />
        <text class="bar-btn-text">
          {{ displayButtonText }}
        </text>
      </view>
    </view>
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

.content-scroll {
  flex: 1;
  padding-bottom: 160rpx;
}

.content-inner {
  padding: 32rpx;
  max-width: 900rpx;
  margin: 0 auto;
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

/* ========== 标题与价格区域 ========== */
.pricing-section {
  margin-bottom: 48rpx;
}

/* 标签 */
.offer-tag {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 24rpx;
  background: #b9e2ff;
  border-radius: 999rpx;
}

.tag-icon-font {
  font-size: 24rpx;
  color: #3d657e;
}

.tag-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #3d657e;
  letter-spacing: 2rpx;
}

/* 标题 */
.title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: #171c20;
  margin-top: 20rpx;
  line-height: 1.3;
  letter-spacing: -1rpx;
}

/* 描述 */
.desc {
  display: block;
  font-size: 28rpx;
  color: #6e7881;
  line-height: 1.7;
  margin-top: 12rpx;
}

/* 价格行 */
.price-row {
  margin-top: 24rpx;
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.price-now {
  font-size: 60rpx;
  font-weight: 900;
  color: #00AEEF;
  letter-spacing: -2rpx;
}

/* 新增：免费券价格样式 */
.price-free {
  font-size: 60rpx;
  font-weight: 900;
  color: #00AEEF;
  /* 主题色 */
  letter-spacing: -2rpx;
}

.price-old {
  font-size: 28rpx;
  color: #6e7881;
  text-decoration: line-through;
}

/* 标签行 */
.badge-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
}

.badge-primary {
  background: rgba(0, 174, 239, 0.1);
}

.badge-text {
  font-size: 24rpx;
  font-weight: 700;
}

.badge-text-primary {
  color: #00AEEF;
}

.badge-stock {
  background: #dee3e8;
}

.badge-limit {
  background: rgba(141, 79, 0, 0.1);
}

.badge-icon-font {
  font-size: 24rpx;
}

.badge-text-limit {
  color: #8d4f00;
}

/* 购买截止 */
.deadline-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx dashed #bdc8d1;
}

.deadline-icon-font {
  font-size: 28rpx;
  color: #6e7881;
}

.deadline-text {
  font-size: 24rpx;
  color: #6e7881;
}

/* ========== 购买须知 ========== */
.rules-section {
  background: #eff4fa;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 32rpx;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 36rpx;
}

.rules-bar {
  width: 8rpx;
  height: 44rpx;
  background: #00AEEF;
  border-radius: 8rpx;
}

.rules-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #171c20;
  letter-spacing: -0.5rpx;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 36rpx;
}

.rule-item {
  display: flex;
  gap: 24rpx;
}

.rule-icon-box {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  background: #dee3e8;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rule-icon-font {
  font-size: 32rpx;
  color: #00AEEF;
}

.rule-body {
  flex: 1;
}

.rule-label {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #171c20;
  margin-bottom: 6rpx;
}

.rule-desc {
  display: block;
  font-size: 28rpx;
  color: #6e7881;
  line-height: 1.6;
}

/* ========== 适用商户 ========== */
.merchant-section {
  background: #eff4fa;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 32rpx;
}

.merchant-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 36rpx;
}

.merchant-bar {
  width: 8rpx;
  height: 44rpx;
  background: #00AEEF;
  border-radius: 8rpx;
}

.merchant-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #171c20;
  letter-spacing: -0.5rpx;
}

/* 商户网格布局（横向排列，自动换行） */
.merchant-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 20rpx;
}

.merchant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* gap: 12rpx; */
  /* width: calc((100% - 40rpx) / 3); */
  /* 每行3个，间距20rpx */
  transition: all 0.2s ease;
}

.merchant-card:active {
  transform: scale(0.95);
  opacity: 0.9;
}

/* 商户头像（圆角方形） */
.merchant-avatar-box {
  width: 60rpx;
  height: 60rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  background-color: #fff;
}

.merchant-avatar {
  width: 100%;
  height: 100%;
}

.merchant-avatar-placeholder {
  width: 100rpx;
  height: 100rpx;
  border-radius: 16rpx;
  background: #dee3e8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.merchant-avatar-icon {
  font-size: 48rpx;
  color: #00AEEF;
}

/* 商户名称（居中显示） */
.merchant-card-name {
  font-size: 18rpx;
  color: #171c20;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  margin-top: 6rpx;
}

/* ========== 底部保障区域 ========== */
.trust-row {
  display: flex;
  gap: 24rpx;
}

.trust-card {
  flex: 1;
  border-radius: 24rpx;
  padding: 36rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.trust-card-primary {
  background: rgba(0, 174, 239, 0.1);
  border: 2rpx solid rgba(0, 174, 239, 0.2);
}

.trust-card-gray {
  background: #dee3e8;
}

.trust-icon-font {
  font-size: 48rpx;
  color: #00AEEF;
}

.trust-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #00AEEF;
}

.trust-card-sub {
  font-size: 20rpx;
  font-weight: 900;
  color: #6e7881;
  letter-spacing: 4rpx;
}

.trust-card-name {
  font-size: 24rpx;
  font-weight: 700;
  color: #171c20;
}

/* ========== 底部购买栏 ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -8rpx 64rpx 0 rgba(23, 28, 32, 0.04);
  border-radius: 32rpx 32rpx 0 0;
  z-index: 50;
  box-sizing: border-box;
}

.bar-price {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
}

.bar-price-sym {
  font-size: 28rpx;
  font-weight: 700;
  color: #171c20;
  margin-right: 4rpx;
}

.bar-price-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #171c20;
}

/* 新增：底部免费券价格样式 */
.bar-price-free {
  font-size: 44rpx;
  font-weight: 700;
  color: #00AEEF;
  /* 主题色 */
}

.bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 22rpx 48rpx;
  background: #00AEEF;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.bar-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.bar-btn-disabled {
  background: #bdc8d1;
}

.bar-btn-disabled .bar-btn-icon-font,
.bar-btn-disabled .bar-btn-text {
  color: #6e7881;
}

.bar-btn-icon-font {
  font-size: 32rpx;
  color: #ffffff;
}

.bar-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 4rpx;
}
</style>
