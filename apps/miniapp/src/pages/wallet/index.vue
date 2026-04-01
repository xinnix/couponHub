<template>
  <view class="container">
    <text class="title">我的券包</text>
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="getTabClass(tab.value)"
        @click="currentTab = tab.value"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <view v-show="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-show="!loading">
      <view v-show="displayOrders.length === 0" class="empty">
        <text>暂无优惠券</text>
      </view>

      <view v-show="displayOrders.length > 0">
        <view
          v-for="item in displayOrders"
          :key="item.id"
          class="order-item"
          @click="handleOrderClick(item)"
        >
          <view class="order-info">
            <text class="order-title">{{ getTemplateTitle(item) }}</text>
            <text class="order-no">{{ item.orderNo }}</text>
            <text class="order-status">{{ getStatusText(item.status) }}</text>
          </view>
          <view class="order-action">
            <button v-show="item.status === 'UNPAID'" size="mini" @click.stop="handlePay(item)">
              去支付
            </button>
            <button v-show="item.status === 'PAID'" size="mini" @click.stop="showQRCode(item)">
              出示二维码
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { orderApi, paymentApi } from '@/api/business';

const tabs = [
  { label: '待支付', value: 'UNPAID' },
  { label: '待使用', value: 'PAID' },
  { label: '已核销', value: 'REDEEMED' },
  { label: '已退款', value: 'REFUNDED' },
];

const currentTab = ref('PAID');
const loading = ref(false);
const orderList = ref<any[]>([]);

// 计算属性 - 用于显示订单项
const displayOrders = computed(() => {
  return orderList.value || [];
});

// 获取模板标题
const getTemplateTitle = (item: any) => {
  if (item && item.template && item.template.title) {
    return item.template.title;
  }
  return '未知券';
};

// 获取 tab 的 class
const getTabClass = (tabValue: string) => {
  if (currentTab.value === tabValue) {
    return 'tab active';
  }
  return 'tab';
};

onMounted(async () => {
  await loadOrders();
});

watch(currentTab, async () => {
  await loadOrders();
});

async function loadOrders() {
  try {
    loading.value = true;
    const res = await orderApi.getMyOrders({ status: currentTab.value });
    if (Array.isArray(res.data)) {
      orderList.value = res.data;
    } else {
      orderList.value = [];
    }
  } catch (error) {
    uni.showToast({
      title: '加载订单失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
}

function handleOrderClick(item: any) {
  if (!item || !item.id) {
    return;
  }
  uni.navigateTo({ url: `/pages/qrcode/index?orderId=${item.id}` });
}

function showQRCode(item: any) {
  uni.navigateTo({
    url: `/pages/qrcode/index?orderId=${item.id}`,
  });
}

async function handlePay(item: any) {
  try {
    uni.showLoading({ title: '调起支付...', mask: true });

    // 1. 获取微信支付参数
    const payRes = await paymentApi.create({ orderId: item.id });
    const data = payRes.data as any;
    let payParams = null;
    if (data && data.payParams) {
      payParams = data.payParams;
    }

    if (!payParams) {
      throw new Error('获取支付参数失败');
    }

    uni.hideLoading();

    // 2. 调起微信支付
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
            reject(new Error(err.errMsg || '支付失败'))
          }
        },
      })
    })

    // 3. 支付成功，轮询等待回调更新
    uni.showToast({ title: '支付成功', icon: 'success' })

    // 短暂延迟后刷新列表，等待微信回调处理
    setTimeout(async () => {
      await loadOrders()
    }, 1500)
  }
  catch (error: any) {
    uni.hideLoading()
    let msg = '支付失败';
    if (error && error.message) {
      msg = error.message;
    }
    uni.showToast({ title: msg, icon: 'none' })
  }
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    UNPAID: '待支付',
    PAID: '待使用',
    REDEEMED: '已核销',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
    EXPIRED: '已过期',
  };
  return map[status] || status;
}
</script>

<style scoped>
.container {
  padding: 20rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
}

.tabs {
  display: flex;
  margin-bottom: 20rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-right: 10rpx;
}

.tab.active {
  background: #667eea;
  color: #fff;
}

.loading, .empty {
  text-align: center;
  padding: 100rpx;
}

.order-item {
  padding: 20rpx;
  background: #fff;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.order-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.order-no, .order-status {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 5rpx;
}
</style>
