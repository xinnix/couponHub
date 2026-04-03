<script setup lang="ts">
import { ref, computed } from 'vue'
import { couponApi, orderApi, paymentApi } from '@/api/business'

const loading = ref(true)
const coupon = ref<any>(null)
const buying = ref(false)
const statusBarHeight = ref(0)

// 计算属性 - 显示数据
const displayTitle = computed(() => {
  if (coupon.value && coupon.value.title) {
    return coupon.value.title;
  }
  return '';
});

const displayBuyPrice = computed(() => {
  if (coupon.value && coupon.value.buyPrice) {
    const price = parseFloat(coupon.value.buyPrice);
    return isNaN(price) ? 0 : price;
  }
  return 0;
});

const displayFaceValue = computed(() => {
  if (coupon.value && coupon.value.faceValue) {
    const value = parseFloat(coupon.value.faceValue);
    return isNaN(value) ? 0 : value;
  }
  return 0;
});

const displayStock = computed(() => {
  if (coupon.value && coupon.value.stock !== undefined) {
    const stock = parseInt(coupon.value.stock);
    return isNaN(stock) ? 0 : stock;
  }
  return 0;
});

const displayValidFrom = computed(() => {
  if (coupon.value && coupon.value.validFrom) {
    return coupon.value.validFrom;
  }
  return '';
});

const displayValidUntil = computed(() => {
  if (coupon.value && coupon.value.validUntil) {
    return coupon.value.validUntil;
  }
  return '';
});

const displayDescription = computed(() => {
  if (coupon.value && coupon.value.description) {
    return coupon.value.description;
  }
  return '在商户门店尽享专属优惠。本券适用于店内所有商品，包括季节新品及精选配饰。';
});

const displayMerchantName = computed(() => {
  if (coupon.value && coupon.value.merchant && coupon.value.merchant.name) {
    return coupon.value.merchant.name;
  }
  return '商户门店';
});

const displayButtonText = computed(() => {
  if (buying.value) {
    return '处理中...';
  }
  if (!coupon.value || displayStock.value <= 0) {
    return '已售罄';
  }
  return '立即购买';
});

const isButtonDisabled = computed(() => {
  return buying.value || !coupon.value || displayStock.value <= 0;
});

const discountPercent = computed(() => {
  if (displayFaceValue.value > 0 && displayBuyPrice.value > 0) {
    const discount = ((displayFaceValue.value - displayBuyPrice.value) / displayFaceValue.value * 100).toFixed(0);
    return discount;
  }
  return '50';
});

// 格式化价格函数
function formatPrice(price: number): string {
  return price.toFixed(2);
}

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  let couponId = '';

  // 从普通参数获取
  if (options && options.id) {
    couponId = options.id;
  }

  // 从 scene 参数获取（扫码进入）
  if (options && options.scene) {
    const scene = decodeURIComponent(options.scene);
    couponId = scene;
  }

  if (couponId) {
    await loadCoupon(couponId)
  }
  else {
    loading.value = false
    uni.showToast({ title: '参数错误', icon: 'none' });
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
  if (buying.value) return
  if (!coupon.value) return

  // 检查库存
  const stockNum = parseInt(coupon.value.stock) || 0;
  if (stockNum <= 0) {
    uni.showToast({ title: '库存不足', icon: 'none' })
    return
  }

  // 确认购买
  const buyPriceNum = parseFloat(coupon.value.buyPrice) || 0;
  const faceValueNum = parseFloat(coupon.value.faceValue) || 0;

  await new Promise<void>((resolve) => {
    uni.showModal({
      title: '确认购买',
      content: `${coupon.value.title}\n价格：¥${formatPrice(buyPriceNum)}\n面值：¥${formatPrice(faceValueNum)}`,
      confirmText: '确认支付',
      success: (res) => {
        if (res.confirm) resolve()
      },
    })
  })

  try {
    buying.value = true
    uni.showLoading({ title: '下单中...', mask: true })

    // 1. 创建订单
    const orderRes = await orderApi.create({ templateId: coupon.value.id })
    const orderData = orderRes.data as any;
    let orderId = '';
    if (orderData && orderData.order && orderData.order.id) {
      orderId = orderData.order.id;
    }
    if (!orderId) {
      throw new Error('创建订单失败')
    }

    // 2. 创建支付，获取微信支付参数
    uni.showLoading({ title: '调起支付...', mask: true })
    const payRes = await paymentApi.create({ orderId })
    const payData = payRes.data as any;
    let payParams = null;
    if (payData && payData.payParams) {
      payParams = payData.payParams;
    }

    if (!payParams) {
      throw new Error('获取支付参数失败')
    }

    uni.hideLoading()

    // 3. 调起微信支付
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
          let errMsg = '';
          if (err && err.errMsg) {
            errMsg = err.errMsg;
          }
          if (errMsg.includes('cancel')) {
            reject(new Error('支付取消'))
          }
          else {
            const errorMsg = errMsg || '支付失败';
            reject(new Error(errorMsg))
          }
        },
      })
    })

    // 4. 支付成功，跳转到券包（回调会更新订单状态）
    uni.showToast({ title: '支付成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/wallet/index' })
    }, 1000)
  }
  catch (error: any) {
    uni.hideLoading()
    let respData = null;
    if (error && error.response && error.response.data) {
      respData = error.response.data;
    }
    let respMsg = '';
    if (respData && respData.message) {
      respMsg = respData.message;
    }
    let errMsg = '';
    if (error && error.message) {
      errMsg = error.message;
    }
    const msg = respMsg || errMsg || '购买失败'
    uni.showToast({ title: msg, icon: 'none' })
  }
  finally {
    buying.value = false
  }
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
</script>

<template>
  <view class="page-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left">
          <view class="back-btn" @click="goBack">
            <text class="back-icon">←</text>
          </view>
          <text class="nav-title">优惠券详情</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 主内容区域 -->
    <view v-else class="main-content">
      <!-- 标题和价格区域 -->
      <view class="pricing-section">
        <view class="tag-container">
          <view class="offer-tag">
            <text class="tag-icon">🏷</text>
            <text class="tag-text">限时特惠</text>
          </view>
        </view>
        <text class="coupon-title">{{ displayTitle }}</text>
        <text class="coupon-description">{{ displayDescription }}</text>

        <view class="price-container">
          <text class="current-price">¥{{ formatPrice(displayBuyPrice) }}</text>
          <text class="original-price">¥{{ formatPrice(displayFaceValue) }}</text>
          <view class="discount-tag">
            <text class="discount-text">立省 {{ discountPercent }}%</text>
          </view>
        </view>
      </view>

      <!-- 使用规则区域 -->
      <view class="rules-section">
        <view class="rules-header">
          <view class="rules-indicator"></view>
          <text class="rules-title">使用规则</text>
        </view>

        <view class="rules-list">
          <!-- 有效期 -->
          <view class="rule-item">
            <view class="rule-icon-box">
              <text class="rule-icon">📅</text>
            </view>
            <view class="rule-content">
              <text class="rule-label">有效期</text>
              <text class="rule-desc">自购买之日起30天内有效</text>
            </view>
          </view>

          <!-- 使用范围 -->
          <view class="rule-item">
            <view class="rule-icon-box">
              <text class="rule-icon">🏪</text>
            </view>
            <view class="rule-content">
              <text class="rule-label">使用范围</text>
              <text class="rule-desc">仅限 {{ displayMerchantName }} 门店使用</text>
            </view>
          </view>

          <!-- 叠加规则 -->
          <view class="rule-item">
            <view class="rule-icon-box">
              <text class="rule-icon">📦</text>
            </view>
            <view class="rule-content">
              <text class="rule-label">叠加规则</text>
              <text class="rule-desc">不与其他优惠活动同时使用，每单限用一张</text>
            </view>
          </view>

          <!-- 退改规则 -->
          <view class="rule-item">
            <view class="rule-icon-box">
              <text class="rule-icon">↩️</text>
            </view>
            <view class="rule-content">
              <text class="rule-label">退改规则</text>
              <text class="rule-desc">未核销前支持随时退款</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商家信息区域 -->
      <view class="merchant-section" v-if="coupon && coupon.merchant">
        <view class="merchant-image-box">
          <image
            v-if="coupon.merchant.coverImage"
            :src="coupon.merchant.coverImage"
            class="merchant-image"
            mode="aspectFill"
          />
          <view v-else class="merchant-placeholder">
            <text class="placeholder-icon">🏪</text>
          </view>
        </view>
        <view class="merchant-info-box">
          <view class="verified-badge">
            <text class="verified-icon">✓</text>
          </view>
          <view class="merchant-info">
            <text class="merchant-label">推荐方</text>
            <text class="merchant-name">社区商圈</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部购买栏 -->
    <view class="bottom-bar">
      <view class="price-display">
        <text class="price-symbol">¥</text>
        <text class="price-value">{{ formatPrice(displayBuyPrice) }}</text>
      </view>
      <button
        class="buy-btn"
        :disabled="isButtonDisabled"
        @click="handleBuy"
      >
        <text class="buy-icon">🛍️</text>
        <text class="buy-text">{{ displayButtonText }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped>
/* 页面容器 */
.page-container {
  min-height: 100vh;
  background: #f5faff;
  padding-bottom: 120rpx;
}

/* 顶部导航栏 */
.nav-bar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 50;
  background: rgba(245, 250, 255, 0.8);
  backdrop-filter: blur(20px);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.back-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:active {
  transform: scale(0.95);
  opacity: 0.7;
}

.back-icon {
  font-size: 36rpx;
  color: #00AEEF;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #171c20;
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

/* 主内容区域 */
.main-content {
  padding: 140rpx 32rpx 0;
  max-width: 900rpx;
  margin: 0 auto;
}

/* 标题和价格区域 */
.pricing-section {
  margin-bottom: 48rpx;
}

.tag-container {
  margin-bottom: 16rpx;
}

.offer-tag {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 20rpx;
  background: #b9e2ff;
  border-radius: 48rpx;
}

.tag-icon {
  font-size: 20rpx;
}

.tag-text {
  font-size: 24rpx;
  font-weight: bold;
  color: #3d657e;
  letter-spacing: 2rpx;
}

.coupon-title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: #171c20;
  margin: 16rpx 0 12rpx;
  line-height: 1.3;
}

.coupon-description {
  display: block;
  font-size: 28rpx;
  color: #6e7881;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.price-container {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 16rpx;
}

.current-price {
  font-size: 64rpx;
  font-weight: 900;
  color: #00AEEF;
}

.original-price {
  font-size: 28rpx;
  color: #6e7881;
  text-decoration: line-through;
}

.discount-tag {
  margin-left: auto;
  padding: 8rpx 16rpx;
  background: rgba(0, 174, 239, 0.1);
  border-radius: 12rpx;
}

.discount-text {
  font-size: 24rpx;
  font-weight: bold;
  color: #00AEEF;
}

/* 使用规则区域 */
.rules-section {
  background: #eff4fa;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.rules-indicator {
  width: 8rpx;
  height: 48rpx;
  background: #00AEEF;
  border-radius: 8rpx;
}

.rules-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #171c20;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
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

.rule-icon {
  font-size: 32rpx;
}

.rule-content {
  flex: 1;
}

.rule-label {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #171c20;
  margin-bottom: 8rpx;
}

.rule-desc {
  display: block;
  font-size: 28rpx;
  color: #6e7881;
  line-height: 1.5;
}

/* 商家信息区域 */
.merchant-section {
  display: flex;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.merchant-image-box {
  flex: 7;
  height: 300rpx;
  background: rgba(222, 227, 232, 0.5);
  border-radius: 24rpx;
  overflow: hidden;
}

.merchant-image {
  width: 100%;
  height: 100%;
}

.merchant-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 80rpx;
}

.merchant-info-box {
  flex: 5;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.verified-badge {
  flex: 1;
  background: #00AEEF;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verified-icon {
  font-size: 48rpx;
  color: #ffffff;
}

.merchant-info {
  flex: 1;
  background: #dee3e8;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.merchant-label {
  display: block;
  font-size: 20rpx;
  font-weight: 900;
  color: #6e7881;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  margin-bottom: 8rpx;
}

.merchant-name {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  color: #171c20;
}

/* 底部购买栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  background: #ffffff;
  box-shadow: 0 -8rpx 64rpx 0 rgba(23, 28, 32, 0.04);
  border-radius: 32rpx 32rpx 0 0;
  z-index: 50;
}

.price-display {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 28rpx;
  font-weight: bold;
  color: #171c20;
  margin-right: 4rpx;
}

.price-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #171c20;
}

.buy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx 64rpx;
  background: #00AEEF;
  color: #ffffff;
  border-radius: 16rpx;
  border: none;
  transition: all 0.15s;
}

.buy-btn:active {
  transform: scale(0.98);
}

.buy-btn[disabled] {
  background: #bdc8d1;
  color: #6e7881;
}

.buy-icon {
  font-size: 32rpx;
}

.buy-text {
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  text-transform: uppercase;
}
</style>
