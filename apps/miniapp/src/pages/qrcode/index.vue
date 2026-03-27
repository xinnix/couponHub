<template>
  <view class="container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="nav-title">核销二维码</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="error" class="error">
      <text>{{ error }}</text>
    </view>

    <view v-else class="qrcode-content">
      <view class="qrcode-box">
        <canvas
          id="qrcode-canvas"
          canvas-id="qrcode-canvas"
          class="qrcode-canvas"
          :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
        />
        <text class="refresh-tip">二维码将在 {{ countdown }} 秒后刷新</text>
      </view>

      <view class="order-info">
        <text class="coupon-title">{{ order?.template?.title }}</text>
        <text class="order-no">订单号: {{ order?.orderNo }}</text>
        <text class="amount">面值: ¥{{ order?.faceValue }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { orderApi } from '@/api/business'
import UQRCode from 'uqrcodejs'

const loading = ref(true)
const error = ref('')
const order = ref<any>(null)
const countdown = ref(30)
const canvasSize = ref(200)
const statusBarHeight = ref(0)

let timer: any = null
let qrcode: UQRCode | null = null

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  const orderId = options?.id || options?.orderId
  if (!orderId) {
    error.value = '缺少订单信息'
    loading.value = false
    return
  }
  await loadOrder(orderId)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

async function loadOrder(id: string) {
  try {
    loading.value = true
    error.value = ''
    const res = await orderApi.getDetail(id)
    order.value = res.data

    if (order.value?.status !== 'PAID') {
      error.value = '该订单无法核销（状态：' + getStatusText(order.value?.status) + '）'
      return
    }

    // 生成二维码
    await nextTick()
    generateQRCode()
    startCountdown()
  }
  catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '加载失败'
    error.value = msg
  }
  finally {
    loading.value = false
  }
}

function generateQRCode() {
  if (!order.value?.id) return

  // 每次刷新生成新的核销码（含时间戳防截屏）
  const code = JSON.stringify({
    orderId: order.value.id,
    orderNo: order.value.orderNo,
    ts: Date.now(),
  })

  qrcode = new UQRCode()
  qrcode.data = code
  qrcode.size = canvasSize.value * 2 // 2倍分辨率
  qrcode.margin = 10
  qrcode.make()

  const canvasContext = uni.createCanvasContext('qrcode-canvas')
  qrcode.canvasContext = canvasContext
  qrcode.drawCanvas()

  countdown.value = 30
}

function startCountdown() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      generateQRCode()
    }
  }, 1000)
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    UNPAID: '待支付',
    PAID: '待使用',
    REDEEMED: '已核销',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
    EXPIRED: '已过期',
  }
  return map[status] || status
}
</script>

<style scoped>
.container {
  padding: 0;
  min-height: 100vh;
  background: #f5f5f5;
}

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

.loading, .error {
  text-align: center;
  padding: 100rpx;
}

.error {
  color: #ff4d4f;
}

.qrcode-content {
  padding: 20rpx;
}

.qrcode-box {
  background: #fff;
  padding: 40rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.qrcode-canvas {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: block;
}

.refresh-tip {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}

.order-info {
  background: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
}

.coupon-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.order-no, .amount {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}
</style>
