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

    <view v-show="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-show="!loading && error" class="error">
      <text>{{ error }}</text>
    </view>

    <view v-show="!loading && !error" class="qrcode-content">
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
        <text class="coupon-title">{{ orderTitle }}</text>
        <text class="order-no">订单号: {{ orderNo }}</text>
        <text class="amount">面值: ¥{{ orderFaceValue }}</text>
        <text class="status">状态: {{ statusText }}</text>
      </view>

      <button
        v-if="canRefund"
        class="refund-btn"
        :disabled="refunding"
        @click="handleRefund"
      >
        {{ refunding ? '处理中...' : '申请退款' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { orderApi } from '@/api/business'
import UQRCode from 'uqrcodejs'

const loading = ref(true)
const error = ref('')
const order = ref<any>(null)
const countdown = ref(30)
const canvasSize = ref(200)
const statusBarHeight = ref(0)
const refunding = ref(false)

let timer: any = null
let qrcode: UQRCode | null = null

// 计算属性 - 简化模板显示
const orderTitle = computed(() => {
  if (order.value && order.value.template && order.value.template.title) {
    return order.value.template.title;
  }
  return '未知券';
});

const orderNo = computed(() => {
  if (order.value && order.value.orderNo) {
    return order.value.orderNo;
  }
  return '';
});

const orderFaceValue = computed(() => {
  if (order.value && order.value.faceValue) {
    return order.value.faceValue;
  }
  return 0;
});

const statusText = computed(() => {
  if (order.value && order.value.status) {
    return getStatusText(order.value.status);
  }
  return '';
});

const canRefund = computed(() => {
  // 只有已支付且未核销的订单才能退款
  return order.value && order.value.status === 'PAID';
});

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  let id1 = '';
  let id2 = '';
  if (options && options.id) {
    id1 = options.id;
  }
  if (options && options.orderId) {
    id2 = options.orderId;
  }
  const orderId = id1 || id2;
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

    let orderStatus = '';
    if (order.value && order.value.status) {
      orderStatus = order.value.status;
    }
    if (orderStatus !== 'PAID') {
      error.value = '该订单无法核销（状态：' + getStatusText(orderStatus) + '）'
      return
    }

    // 生成二维码
    await nextTick()
    generateQRCode()
    startCountdown()
  }
  catch (err: any) {
    let respData = null;
    if (err && err.response && err.response.data) {
      respData = err.response.data;
    }
    let respMsg = '';
    if (respData && respData.message) {
      respMsg = respData.message;
    }
    let errMsg = '';
    if (err && err.message) {
      errMsg = err.message;
    }
    const msg = respMsg || errMsg || '加载失败'
    error.value = msg
  }
  finally {
    loading.value = false
  }
}

function generateQRCode() {
  if (!order.value || !order.value.id) return

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

async function handleRefund() {
  if (refunding.value) return
  if (!order.value) return

  // 确认退款
  await new Promise<void>((resolve) => {
    uni.showModal({
      title: '确认退款',
      content: `确定要退款吗？\n订单号：${order.value.orderNo}\n面值：¥${order.value.faceValue}`,
      confirmText: '确认退款',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) resolve()
      },
    })
  })

  try {
    refunding.value = true
    uni.showLoading({ title: '处理中...', mask: true })

    // 调用退款API
    await orderApi.requestRefund({
      orderId: order.value.id,
      reason: '用户主动退款',
    })

    uni.hideLoading()
    uni.showToast({
      title: '退款申请已提交',
      icon: 'success',
      duration: 2000,
    })

    // 延迟后返回上一页
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 2000)
  }
  catch (err: any) {
    uni.hideLoading()
    let respData = null;
    if (err && err.response && err.response.data) {
      respData = err.response.data;
    }
    let respMsg = '';
    if (respData && respData.message) {
      respMsg = respData.message;
    }
    let errMsg = '';
    if (err && err.message) {
      errMsg = err.message;
    }
    const msg = respMsg || errMsg || '退款失败'
    uni.showToast({
      title: msg,
      icon: 'none',
    })
  }
  finally {
    refunding.value = false
  }
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
  margin-bottom: 20rpx;
}

.coupon-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.order-no, .amount, .status {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.refund-btn {
  width: 100%;
  padding: 24rpx;
  background: #ff4d4f;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin-top: 20rpx;
}

.refund-btn[disabled] {
  background: #ccc;
  color: #fff;
}
</style>
