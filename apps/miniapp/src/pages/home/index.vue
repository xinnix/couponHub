<template>
  <view class="home-container">
    <!-- 头部 -->
    <view class="header">
      <text class="title">优惠券商城</text>
      <view class="user-info" @click="handleUserClick">
        <image v-show="hasAvatar" :src="avatarUrl" class="avatar" />
        <view v-show="!hasAvatar" class="avatar-placeholder">
          <text class="icon">👤</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-actions">
      <view class="action-item" @click="handleNavigate('/pages/wallet/index')">
        <text class="action-icon">🎫</text>
        <text class="action-text">我的券包</text>
      </view>
      <view class="action-item" @click="handleNavigate('/pages/scan/index')">
        <text class="action-icon">📷</text>
        <text class="action-text">扫码核销</text>
      </view>
      <view class="action-item" @click="handleNavigate('/pages/qrcode/index')">
        <text class="action-icon">📱</text>
        <text class="action-text">我的二维码</text>
      </view>
    </view>

    <!-- 优惠券推荐 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">🔥 热门优惠券</text>
        <text class="section-more" @click="handleMoreCoupons">查看更多 ›</text>
      </view>
      <scroll-view scroll-x class="coupon-scroll">
        <view
          v-for="coupon in couponList"
          :key="coupon.id"
          class="coupon-card"
          @click="handleCouponClick(coupon.id)"
        >
          <view class="coupon-left">
            <text class="coupon-price">¥{{ coupon.faceValue }}</text>
            <text class="coupon-buy-price">售价 ¥{{ coupon.buyPrice }}</text>
          </view>
          <view class="coupon-right">
            <text class="coupon-title">{{ coupon.title }}</text>
            <text class="coupon-valid">
              有效期: {{ formatDate(coupon.validUntil) }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 推荐商户 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">🏪 推荐商户</text>
        <text class="section-more" @click="handleMoreMerchants">查看更多 ›</text>
      </view>
      <view class="merchant-grid">
        <view
          v-for="merchant in merchantList"
          :key="merchant.id"
          class="merchant-card"
          @click="handleMerchantClick(merchant.id)"
        >
          <image
            v-show="merchant.logo"
            :src="merchant.logo"
            class="merchant-logo"
            mode="aspectFill"
          />
          <view v-show="!merchant.logo" class="merchant-logo-placeholder">
            <text>{{ merchant.name.charAt(0) }}</text>
          </view>
          <text class="merchant-name">{{ merchant.name }}</text>
          <text class="merchant-category">{{ merchant.category }}</text>
          <text v-show="merchant.floor" class="merchant-floor">{{ merchant.floor }}</text>
        </view>
      </view>
    </view>

    <!-- 新闻动态 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">📢 新闻动态</text>
      </view>
      <view class="news-list">
        <view
          v-for="news in newsList"
          :key="news.id"
          class="news-item"
          @click="handleNewsClick(news.id)"
        >
          <image
            v-show="news.bannerUrl"
            :src="news.bannerUrl"
            class="news-banner"
            mode="aspectFill"
          />
          <view class="news-content">
            <text class="news-title">{{ news.title }}</text>
            <text class="news-date">{{ formatDate(news.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { merchantApi, newsApi, couponApi } from '@/api/business';
import { authApi } from '@/api/auth';
import CustomTabBar from '@/components/CustomTabBar.vue';

const loading = ref(false);
const userInfo = ref<any>(null);

const couponList = ref<any[]>([]);
const merchantList = ref<any[]>([]);
const newsList = ref<any[]>([]);

// 计算属性 - 简化模板逻辑
const hasAvatar = computed(() => {
  if (userInfo.value && userInfo.value.avatar) {
    return true;
  }
  return false;
});

const avatarUrl = computed(() => {
  if (userInfo.value && userInfo.value.avatar) {
    return userInfo.value.avatar;
  }
  return '';
});

function toArray(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

onMounted(async () => {
  // 获取用户信息
  userInfo.value = uni.getStorageSync('userInfo');

  // 加载数据
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    // 并行加载所有数据
    const [couponsRes, merchantsRes, newsRes] = await Promise.all([
      couponApi.getList({ limit: 5, status: 'ACTIVE' }),
      merchantApi.getList({ limit: 6, status: 'ACTIVE' }),
      newsApi.getList({ limit: 5, status: 'PUBLISHED' }),
    ]);

    couponList.value = toArray(couponsRes.data);
    merchantList.value = toArray(merchantsRes.data);
    newsList.value = toArray(newsRes.data);
  } catch (error) {
    uni.showToast({ title: '首页数据加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const handleUserClick = () => {
  uni.showLoading({ title: '加载中...' });
  authApi.getProfile()
    .then((res) => {
      userInfo.value = res.data || userInfo.value;
      uni.setStorageSync('userInfo', userInfo.value);
      uni.showToast({ title: '用户信息已更新', icon: 'success' });
    })
    .catch(() => {
      uni.showToast({ title: '获取用户信息失败', icon: 'none' });
    })
    .finally(() => {
      uni.hideLoading();
    });
};

const handleNavigate = (url: string) => {
  uni.navigateTo({ url });
};

const handleCouponClick = (id: string) => {
  uni.navigateTo({ url: `/pages/coupon/detail?id=${id}` });
};

const handleMerchantClick = (id: string) => {
  console.log('====== 首页商户点击 ======')
  console.log('商户 ID:', id)
  console.log('商户 ID 类型:', typeof id)

  if (!id) {
    console.error('❌ 商户 ID 为空')
    uni.showToast({ title: '商户ID无效', icon: 'none' })
    return
  }

  console.log('✅ 准备跳转到商户详情页')
  uni.navigateTo({
    url: `/pages/merchant/detail?id=${id}`,
    success: () => {
      console.log('✅ 跳转成功')
    },
    fail: (err) => {
      console.error('❌ 跳转失败:', err)
      uni.showToast({ title: '跳转失败', icon: 'none' })
    }
  })
};

const handleNewsClick = (id: string) => {
  newsApi.getDetail(id)
    .then((res) => {
      const news = res.data as any;
      let title = '新闻详情';
      if (news && news.title) {
        title = news.title;
      }
      let content = '暂无内容';
      if (news && news.content) {
        content = news.content;
      }
      uni.showModal({
        title: title,
        content: content,
        showCancel: false,
      });
    })
    .catch(() => {
      uni.showToast({ title: '加载新闻失败', icon: 'none' });
    });
};

const handleMoreCoupons = () => {
  couponApi.getList({ limit: 20, status: 'ACTIVE' })
    .then((res) => {
      if (Array.isArray(res.data)) {
        couponList.value = res.data;
      }
      uni.showToast({ title: '已加载更多优惠券', icon: 'success' });
    })
    .catch(() => {
      uni.showToast({ title: '加载失败', icon: 'none' });
    });
};

const handleMoreMerchants = () => {
  merchantApi.getList({ limit: 20, status: 'ACTIVE' })
    .then((res) => {
      if (Array.isArray(res.data)) {
        merchantList.value = res.data;
      }
      uni.showToast({ title: '已加载更多商户', icon: 'success' });
    })
    .catch(() => {
      uni.showToast({ title: '加载失败', icon: 'none' });
    });
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
  padding-bottom: 200rpx;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 80rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.user-info {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  font-size: 32rpx;
}

.icon {
  font-size: 40rpx;
}

/* 快捷入口 */
.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: 32rpx;
  background: #ffffff;
  margin: -20rpx 32rpx 32rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.action-icon {
  font-size: 48rpx;
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

/* 区块 */
.section {
  margin-bottom: 32rpx;
  padding: 0 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #999;
}

/* 优惠券横向滚动 */
.coupon-scroll {
  white-space: nowrap;
}

.coupon-card {
  display: inline-flex;
  width: 600rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-right: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.coupon-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-right: 24rpx;
  border-right: 2rpx dashed rgba(255, 255, 255, 0.3);
  min-width: 160rpx;
}

.coupon-price {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.coupon-buy-price {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

.coupon-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 24rpx;
}

.coupon-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.coupon-valid {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 商户网格 */
.merchant-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.merchant-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.merchant-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.merchant-logo-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.merchant-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.merchant-category {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 4rpx;
}

.merchant-floor {
  font-size: 20rpx;
  color: #667eea;
}

/* 新闻列表 */
.news-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.news-item {
  display: flex;
  background: #ffffff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.news-banner {
  width: 200rpx;
  height: 160rpx;
  flex-shrink: 0;
}

.news-content {
  flex: 1;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.news-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.news-date {
  font-size: 22rpx;
  color: #999;
  margin-top: 12rpx;
}
</style>
