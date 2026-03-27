<script setup lang="ts">
import { ref } from 'vue'
import { couponApi, orderApi, paymentApi } from '@/api/business'

const loading = ref(true)
const coupon = ref<any>(null)
const buying = ref(false)
const statusBarHeight = ref(0)

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  const couponId = options?.id
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
    const orderId = orderRes.data?.order?.id
    if (!orderId) {
      throw new Error('创建订单失败')
    }

    // 2. 模拟支付
    uni.showLoading({ title: '支付中...', mask: true })
    await paymentApi.create({ orderId })

    uni.hideLoading()
    uni.showToast({ title: '购买成功', icon: 'success' })

    // 跳转到我的券包
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/wallet/index' })
    }, 1000)
  }
  catch (error: any) {
    uni.hideLoading()
    const msg = error?.response?.data?.message || error?.message || '购买失败'
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

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <view v-else-if="coupon" class="content">
      <view class="info-card">
        <text class="coupon-title">
          {{ coupon.title }}
        </text>
        <text class="price">
          ¥{{ coupon.buyPrice }} 购 ¥{{ coupon.faceValue }}
        </text>
        <text class="stock">
          剩余: {{ coupon.stock }}
        </text>
        <text class="validity">
          有效期: {{ formatDate(coupon.validFrom) }} - {{ formatDate(coupon.validUntil) }}
        </text>
      </view>
      <button
        class="buy-btn"
        :disabled="buying || !coupon || coupon.stock <= 0"
        @click="handleBuy"
      >
        {{ buying ? '处理中...' : (coupon?.stock <= 0 ? '已售罄' : '立即购买') }}
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
