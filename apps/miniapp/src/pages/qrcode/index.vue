<script setup lang="ts">
import UQRCode from 'uqrcodejs'
import { computed, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { orderApi } from '@/api/business'
import CustomTabBar from '@/components/CustomTabBar.vue'

const instance = getCurrentInstance()

definePage({
  type: 'page',
  style: {
    backgroundColor: '#F5FAFF',
  },
})

const loading = ref(true)
const error = ref('')
const order = ref<any>(null)
const countdown = ref(300) // 5分钟倒计时
const canvasSize = ref(200) // 标准尺寸，适合屏幕显示和扫描
const statusBarHeight = ref(0)
const refunding = ref(false)

let timer: any = null

// 计算属性 - 简化模板显示
const orderTitle = computed(() => {
  if (order.value && order.value.template && order.value.template.title) {
    return order.value.template.title
  }
  return '未知券'
})

const orderNo = computed(() => {
  if (order.value && order.value.orderNo) {
    return order.value.orderNo
  }
  return ''
})

const orderFaceValue = computed(() => {
  if (order.value && order.value.faceValue) {
    return order.value.faceValue
  }
  return 0
})

const statusText = computed(() => {
  if (order.value && order.value.status) {
    return getStatusText(order.value.status)
  }
  return ''
})

const canRefund = computed(() => {
  // 只有已支付且未核销的订单才能退款
  // 且必须是非免费订单（用户实际支付了金额）
  if (!order.value || order.value.status !== 'PAID')
    return false

  // 免费领取的订单不显示退款按钮
  return !order.value.isFreeOrder
})

// 获取状态栏高度
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad(async (options: any) => {
  let id1 = ''
  let id2 = ''
  if (options && options.id) {
    id1 = options.id
  }
  if (options && options.orderId) {
    id2 = options.orderId
  }
  const orderId = id1 || id2
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

    // 1. 获取订单详情
    const res = await orderApi.getDetail(id)
    order.value = res.data

    let orderStatus = ''
    if (order.value && order.value.status) {
      orderStatus = order.value.status
    }
    if (orderStatus !== 'PAID') {
      error.value = `该订单无法核销（状态：${getStatusText(orderStatus)}）`
      return
    }

    // 2. 生成二维码
    await nextTick()
    await generateQRCode()
    startCountdown()
  }
  catch (err: any) {
    let respData = null
    if (err && err.response && err.response.data) {
      respData = err.response.data
    }
    let respMsg = ''
    if (respData && respData.message) {
      respMsg = respData.message
    }
    let errMsg = ''
    if (err && err.message) {
      errMsg = err.message
    }
    const msg = respMsg || errMsg || '加载失败'
    error.value = msg
  }
  finally {
    loading.value = false
  }
}

async function generateQRCode() {
  if (!order.value || !order.value.id)
    return

  try {
    // 调用后端API生成带签名的二维码
    const qrcodeRes = await orderApi.generateQRCode(order.value.id)
    const code = qrcodeRes.data.code

    // 获取uQRCode实例
    const qr = new UQRCode()
    qr.data = code // 使用后端生成的安全二维码
    qr.size = canvasSize.value // 必须与canvas设置的宽高一致
    qr.margin = 0
    qr.make()

    // 获取canvas上下文，必须传入组件实例
    const canvasContext = uni.createCanvasContext('qrcode-canvas', instance?.proxy)
    qr.canvasContext = canvasContext
    qr.drawCanvas()

    countdown.value = 300
  }
  catch (err: any) {
    console.error('生成二维码失败:', err)
    uni.showToast({
      title: '生成二维码失败',
      icon: 'none',
    })
  }
}

function startCountdown() {
  if (timer)
    clearInterval(timer)
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
  if (refunding.value)
    return
  if (!order.value)
    return

  // 确认退款
  await new Promise<void>((resolve) => {
    uni.showModal({
      title: '确认退款',
      content: `确定要退款吗？\n订单号：${order.value.orderNo}\n面值：¥${order.value.faceValue}`,
      confirmText: '确认退款',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm)
          resolve()
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
    let respData = null
    if (err && err.response && err.response.data) {
      respData = err.response.data
    }
    let respMsg = ''
    if (respData && respData.message) {
      respMsg = respData.message
    }
    let errMsg = ''
    if (err && err.message) {
      errMsg = err.message
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

<template>
  <view class="relative mt-4 min-h-screen bg-surface text-on-surface font-body antialiased">
    <!-- 背景品牌图案 -->
    <view class="brand-pattern pointer-events-none fixed left-0 top-0 z--1 h-full w-full" :style="{
      backgroundImage: 'url(../static/bg.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '400rpx',
      backgroundPosition: 'center',
      opacity: 0.03,
    }" />

    <!-- TopAppBar -->

    <!-- 主内容区域 -->
    <view class="page-content relative z-10 px-6 pb-4">
      <!-- 加载状态 -->
      <view v-if="loading" class="flex items-center justify-center py-20">
        <text class="text-on-surface-variant">
          加载中...
        </text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="flex items-center justify-center py-20">
        <text class="text-error">
          {{ error }}
        </text>
      </view>

      <!-- 二维码内容 -->
      <view v-else class="flex flex-col gap-4">
        <!-- 二维码卡片 -->
        <view
          class="qrcode-card relative flex flex-col items-center overflow-hidden rounded-lg bg-white p-8 shadow-card">
          <canvas id="qrcode-canvas" canvas-id="qrcode-canvas" class="qrcode-canvas" />
          <text class="refresh-tip font-medium" mt-4 text-sm text-on-surface-variant>
            二维码将在 {{ countdown }} 秒后刷新
          </text>
        </view>

        <!-- 订单信息卡片 -->
        <view class="order-card relative flex flex-col overflow-hidden rounded-lg bg-white p-6 shadow-card">
          <view class="absolute left-0 top-0 h-full w-1 rounded-l bg-primary-container" />
          <view class="flex flex-col gap-2 pl-2">
            <text class="text-lg text-on-surface font-extrabold">
              {{ orderTitle }}
            </text>
            <text class="text-sm text-on-surface-variant font-medium">
              订单号: {{ orderNo }}
            </text>
            <text class="text-sm text-on-surface-variant font-medium">
              面值: ¥{{ orderFaceValue }}
            </text>
            <view class="status-badge mt-2 flex items-center self-start rounded-full bg-primary-container px-3 py-1">
              <text class="text-xs text-white font-bold">
                {{ statusText }}
              </text>
            </view>
          </view>
        </view>

        <!-- 退款按钮 -->
        <button v-if="canRefund"
          class="refund-btn mt-4 w-full rounded-lg bg-error py-3 text-base text-white font-bold transition-transform shadow-ambient active-scale-95"
          :disabled="refunding" @click="handleRefund">
          {{ refunding ? '处理中...' : '申请退款' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 品牌图案背景 */
.brand-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

/* 页面内容区域 */
.page-content {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* 顶部栏背景 */
.top-bar-bg {
  background: rgba(245, 250, 255, 0.9);
  backdrop-filter: blur(20rpx);
}

/* 返回按钮 */
.back-btn {
  background: rgba(255, 255, 255, 0.9);
}

/* 二维码卡片 */
.qrcode-card {
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 二维码画布 */
.qrcode-canvas {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: block;
}

/* 刷新提示文字 */
.refresh-tip {
  color: rgba(110, 120, 129, 0.7);
}

/* 订单信息卡片 */
.order-card {
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

/* 状态徽章 */
.status-badge {
  background: #00aeef;
}

/* 退款按钮 */
.refund-btn {
  background: #00aeef;
  border: none;
}

.refund-btn[disabled] {
  background: rgba(189, 200, 209, 0.3);
  color: rgba(110, 120, 129, 0.6);
}

/* 自定义阴影效果 */
.shadow-ambient {
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
}

.shadow-card {
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.03);
}

/* 激活态缩放效果 */
.active-scale-95:active {
  transform: scale(0.95);
}
</style>
