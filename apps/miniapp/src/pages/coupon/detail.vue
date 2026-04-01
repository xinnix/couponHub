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
    return coupon.value.buyPrice;
  }
  return 0;
});

const displayFaceValue = computed(() => {
  if (coupon.value && coupon.value.faceValue) {
    return coupon.value.faceValue;
  }
  return 0;
});

const displayStock = computed(() => {
  if (coupon.value && coupon.value.stock !== undefined) {
    return coupon.value.stock;
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

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  let couponId = '';
  if (options && options.id) {
    couponId = options.id;
  }
  if (couponId) {
    await loadCoupon(couponId)
  }
  else {
    loading.value = false
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
  if (coupon.value.stock <= 0) {
    uni.showToast({ title: '库存不足', icon: 'none' })
    return
  }

  // 确认购买
  await new Promise<void>((resolve) => {
    uni.showModal({
      title: '确认购买',
      content: `${coupon.value.title}\n价格：¥${coupon.value.buyPrice}\n面值：¥${coupon.value.faceValue}`,
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
  <view class="container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="nav-title">券详情</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <view v-show="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-show="!loading" class="content">
      <view class="info-card">
        <text class="coupon-title">{{ displayTitle }}</text>
        <text class="price">¥{{ displayBuyPrice }} 购 ¥{{ displayFaceValue }}</text>
        <text class="stock">剩余: {{ displayStock }}</text>
        <text class="validity">有效期: {{ formatDate(displayValidFrom) }} - {{ formatDate(displayValidUntil) }}</text>
      </view>
      <button class="buy-btn" :disabled="isButtonDisabled" @click="handleBuy">
        {{ displayButtonText }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.container {
  padding: 0;
}

/* 自定义导航栏 */
.nav-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 20rpx;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #ffffff;
  line-height: 1;
  margin-right: 8rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.nav-placeholder {
  width: 64rpx;
}

.content {
  padding: 20rpx;
}

.loading {
  text-align: center;
  padding: 100rpx;
}

.info-card {
  padding: 30rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.coupon-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.price,
.stock,
.validity {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.price {
  color: #ff6b6b;
  font-size: 32rpx;
}

.buy-btn {
  width: 100%;
  padding: 20rpx;
  background: #667eea;
  color: #fff;
  border-radius: 8rpx;
}
</style>
