<template>
  <view class="handler-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 主内容 -->
    <view v-else>
      <!-- 欢迎信息 -->
      <view class="welcome-section">
        <text class="welcome-text">欢迎回来，</text>
        <text class="welcome-name">{{ merchantName }}店员，你好</text>
      </view>

      <!-- 数据统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <view class="stat-header">
            <text class="icon-font icon-check">✓</text>
            <text class="stat-label">今日已核销</text>
          </view>
          <view class="stat-value-group">
            <text class="stat-number">{{ stats.todayRedemptions }}</text>
            <text class="stat-unit">张</text>
          </view>
        </view>

        <view class="stat-card">
          <view class="stat-header">
            <text class="icon-font icon-wallet">¥</text>
            <text class="stat-label">本月预估结算</text>
          </view>
          <view class="stat-value-group">
            <text class="stat-number">{{ stats.monthEstimate }}</text>
            <text class="stat-unit">元</text>
          </view>
        </view>
      </view>

      <!-- 扫码核销按钮 -->
      <button class="scan-button" @click="goScan" hover-class="scan-button-active">
        <text class="scan-text">扫码核销</text>
      </button>

      <!-- 最近核销流水 -->
      <view class="records-section">
        <view class="records-header">
          <text class="records-title">最近核销流水</text>
          <text class="records-link" @click="goRecords">查看全部</text>
        </view>

        <view class="records-list">
          <view v-for="record in recentRecords" :key="record.id" class="record-item">
            <view class="record-info">
              <text class="record-name">{{ record.couponName }}</text>
              <view class="record-meta-row">
                <text class="record-meta">尾号 {{ record.tailNo }} · {{ record.time }}</text>
                <text class="record-handler">{{ record.handlerName }}</text>
              </view>
            </view>
            <text class="record-amount">{{ record.amount }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { authApi } from '@/api/auth';
import { redemptionApi } from '@/api/business';

interface HandlerInfo {
  id: string;
  name: string;
  phone: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  merchantArea: string;
}

interface RedemptionRecord {
  id: string;
  couponName: string;
  tailNo: string;
  time: string;
  amount: string;
  handlerName: string;
}

const handlerInfo = ref<HandlerInfo | null>(null);
const merchantName = ref('');
const stats = ref({
  todayRedemptions: 0,
  monthEstimate: 0,
});

const recentRecords = ref<RedemptionRecord[]>([]);
const loading = ref(false);

onMounted(async () => {
  await loadHandlerData();
});

// 页面显示时刷新数据
onShow(async () => {
  // 如果已经加载过数据，刷新统计数据
  if (handlerInfo.value) {
    await loadHandlerData();
  }
});

async function loadHandlerData() {
  loading.value = true;
  try {
    // 1. 检查核销员身份
    const handlerStatusRes = await authApi.checkHandlerStatus();

    if (!handlerStatusRes.data?.isHandler || !handlerStatusRes.data?.handler) {
      uni.showToast({ title: '您不是核销员', icon: 'none' });
      uni.reLaunch({ url: '/pages/index' });
      return;
    }

    handlerInfo.value = handlerStatusRes.data.handler;
    merchantName.value = handlerInfo.value.merchantName;

    // 保存核销员信息到本地
    uni.setStorageSync('handlerInfo', handlerInfo.value);
    uni.setStorageSync('isHandler', true);

    // 2. 获取核销记录（按商户筛选）
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayRecords, monthRecords] = await Promise.all([
      redemptionApi.getRecords({
        merchantId: handlerInfo.value.merchantId,
        startDate: startOfDay.toISOString(),
        pageSize: 100,
      }),
      redemptionApi.getRecords({
        merchantId: handlerInfo.value.merchantId,
        startDate: startOfMonth.toISOString(),
        pageSize: 100,
      }),
    ]);

    // 3. 计算统计数据
    console.log('今日核销记录返回:', todayRecords);
    console.log('今日核销记录数据:', todayRecords.data);

    if (todayRecords.data && Array.isArray(todayRecords.data)) {
      stats.value.todayRedemptions = todayRecords.data.length;
      console.log('今日核销数量:', stats.value.todayRedemptions);
    }

    if (monthRecords.data && Array.isArray(monthRecords.data)) {
      stats.value.monthEstimate = monthRecords.data.reduce((sum: number, order: any) => {
        // 使用 settlementAmount，为空时 fallback 到 faceValue
        const amount = order.template?.settlementAmount
          ? Number(order.template.settlementAmount)
          : Number(order.faceValue || 0);
        return sum + amount;
      }, 0);
      console.log('本月预估结算:', stats.value.monthEstimate);
    }

    // 4. 获取最近核销流水
    const recentRes = await redemptionApi.getRecords({
      merchantId: handlerInfo.value.merchantId,
      pageSize: 5,
    });

    console.log('最近核销记录返回:', recentRes);
    console.log('最近核销记录数据:', recentRes.data);

    if (recentRes.data && Array.isArray(recentRes.data)) {
      recentRecords.value = recentRes.data.map((order: any) => {
        console.log('处理核销记录 - 完整对象:', JSON.stringify(order, null, 2));
        console.log('核销记录 handler:', order.handler);
        console.log('核销记录 template:', order.template);
        console.log('核销记录 merchant:', order.merchant);

        // 获取尾号（订单号后4位）
        const tailNo = order.orderNo.slice(-4);

        // 格式化时间
        const redeemedAt = new Date(order.redeemedAt);
        const hours = redeemedAt.getHours().toString().padStart(2, '0');
        const minutes = redeemedAt.getMinutes().toString().padStart(2, '0');
        const time = `${hours}:${minutes}`;

        // 格式化金额：显示商户结算金额
        // settlementAmount：商户实际结算金额（补贴场景）
        // faceValue：fallback，当 settlementAmount 为空时使用
        const settlementAmount = order.template?.settlementAmount
          ? Number(order.template.settlementAmount)
          : Number(order.faceValue);
        const amount = `+ ¥${settlementAmount.toFixed(2)}`;

        // 获取核销员姓名
        const handlerName = order.handler?.name || '未知核销员';

        return {
          id: order.id,
          couponName: order.template?.title || '优惠券',
          tailNo,
          time,
          amount,
          handlerName,
        };
      });

      console.log('处理后的核销记录:', recentRecords.value);
    }
  } catch (error) {
    console.error('加载核销员数据失败:', error);
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const goScan = () => {
  uni.navigateTo({ url: '/pages/scan/index' });
};

const goRecords = () => {
  uni.navigateTo({ url: '/pages/handler/records' });
};
</script>

<style scoped>
/* 页面容器 */
.handler-page {
  min-height: 100vh;
  background: #f5faff;
  padding: 32rpx 24rpx 48rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', sans-serif;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.loading-text {
  font-size: 28rpx;
  color: #3e4850;
}

/* 欢迎区域 */
.welcome-section {
  margin-bottom: 48rpx;
}

.welcome-text {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #3e4850;
  letter-spacing: -0.5rpx;
  margin-bottom: 8rpx;
}

.welcome-name {
  display: block;
  font-size: 48rpx;
  font-weight: 800;
  color: #171c20;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32rpx;
  margin-bottom: 32rpx;
}

.stat-card {
  background: #eff4fa;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.icon-font {
  font-size: 24rpx;
}

.icon-check {
  color: #00658d;
}

.icon-wallet {
  color: #8d4f00;
}

.stat-label {
  font-size: 20rpx;
  font-weight: 700;
  color: #3e4850;
  letter-spacing: 2rpx;
}

.stat-value-group {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.stat-number {
  font-size: 48rpx;
  font-weight: 900;
  color: #171c20;
}

.stat-unit {
  font-size: 24rpx;
  font-weight: 700;
  color: #3e4850;
}

/* 扫码核销按钮 */
.scan-button {
  width: 100%;
  height: 88rpx;
  border-radius: 16rpx;
  background: #00aeef;
  box-shadow: 0 4rpx 16rpx rgba(0, 174, 239, 0.25);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border: none;
  margin-bottom: 48rpx;
  transition: transform 0.2s;
}

.scan-button-active {
  transform: scale(0.98);
}

.scan-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

/* 最近核销流水 */
.records-section {
  margin-bottom: 48rpx;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24rpx;
}

.records-title {
  font-size: 28rpx;
  font-weight: 900;
  color: #171c20;
  letter-spacing: 4rpx;
}

.records-link {
  font-size: 20rpx;
  font-weight: 700;
  color: #00658d;
}

/* 核销记录列表 */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  background: #ffffff;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8rpx 24rpx rgba(23, 28, 32, 0.02);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.record-meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.record-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #171c20;
}

.record-meta {
  font-size: 20rpx;
  font-weight: 500;
  color: #3e4850;
}

.record-handler {
  font-size: 20rpx;
  font-weight: 500;
  color: rgba(62, 72, 80, 0.6);
}

.record-amount {
  font-size: 24rpx;
  font-weight: 700;
  color: #00aeef;
}
</style>