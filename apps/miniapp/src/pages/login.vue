<template>
  <view class="login-container">
    <!-- 背景品牌图案 -->
    <view class="brand-pattern pointer-events-none fixed left-0 top-0 z--1 h-full w-full" :style="{
      backgroundImage: 'url(../static/bg.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '400rpx',
      backgroundPosition: 'center',
      opacity: 0.03,
    }" />

    <!-- Logo 顶部栏 -->
    <view class="top-bar-bg sticky top-0 z-50 w-full flex items-center px-4 py-3"
      :style="{ paddingTop: `${statusBarHeight}px` }">
      <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
    </view>

    <!-- 主内容区域 -->
    <view class="login-content">
      <view class="login-header">
        <view class="brand-badge">
          <text class="brand-icon">✨</text>
        </view>
        <text class="title text-on-surface font-extrabold">
          欢迎回来
        </text>
        <text class="subtitle text-on-surface-variant">
          登录开启精彩体验
        </text>
      </view>

      <!-- 微信登录按钮 -->
      <button
        class="wechat-login-btn"
        open-type="getPhoneNumber"
        @getphonenumber="handleWechatLogin"
        :loading="loading"
      >
        <view class="btn-content">
          <text class="btn-icon iconfont icon-weixin" />
          <text class="btn-text">微信一键登录</text>
        </view>
      </button>

      <!-- 分割线 -->
      <view class="divider">
        <view class="divider-line" />
        <text class="divider-text">安全便捷</text>
        <view class="divider-line" />
      </view>

      <!-- 功能说明 -->
      <view class="features">
        <view class="feature-item">
          <text class="feature-icon">🎁</text>
          <text class="feature-text">领取专属优惠券</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">🏪</text>
          <text class="feature-text">探索优质商户</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">💳</text>
          <text class="feature-text">便捷钱包管理</text>
        </view>
      </view>

      <!-- 底部协议 -->
      <view class="footer">
        <text class="tip">登录即表示同意</text>
        <text class="link">《用户协议》</text>
        <text class="tip">和</text>
        <text class="link">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { authApi } from '@/api/auth';

definePage({
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5FAFF',
  },
})

// 状态栏高度
const statusBarHeight = ref(0);

const loading = ref(false);

// 页面加载时获取系统信息
onMounted(() => {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;
});

const handleWechatLogin = async (event: any) => {
  loading.value = true;

  try {
    // 1. 获取微信 code
    const codeRes = await uni.login({ provider: 'weixin' });
    let code = codeRes.code;

    if (!code) {
      throw new Error('获取登录凭证失败');
    }

    // 2. 处理手机号授权（仅在用户同意时）
    let needNewCode = false;
    if (event.detail && event.detail.errMsg === 'getPhoneNumber:ok') {
      if (event.detail.encryptedData && event.detail.iv) {
        try {
          const phoneData = await authApi.getPhoneNumber({
            code, // 使用当前 code 解密手机号
            encryptedData: event.detail.encryptedData,
            iv: event.detail.iv
          });
          // User.phone 已在后端更新，handlerId 也已设置
          console.log('手机号授权成功', phoneData);
          // ⚠️ 重要：code 已被消耗，需要重新获取
          needNewCode = true;
        } catch (error) {
          console.error('手机号授权失败', error);
          // 继续登录流程，但不关联核销员身份
          // code 可能已被消耗，保险起见重新获取
          needNewCode = true;
        }
      }
    } else if (event.detail && event.detail.errMsg) {
      console.log('用户拒绝授权手机号', event.detail.errMsg);
      // 用户拒绝授权，继续登录流程
    }

    // 3. 如果 code 已被消耗，重新获取
    if (needNewCode) {
      const loginRes = await uni.login({ provider: 'weixin' });
      code = loginRes.code;

      if (!code) {
        throw new Error('获取登录凭证失败');
      }
    }

    // 4. 发送到后端进行登录
    const res = await authApi.wechatLogin(code);

    // 5. 存储 token
    uni.setStorageSync('token', res.data.accessToken);
    uni.setStorageSync('refreshToken', res.data.refreshToken);
    uni.setStorageSync('userInfo', res.data.user);

    // 6. 检查核销员身份
    try {
      const handlerRes = await authApi.checkHandlerStatus();
      uni.setStorageSync('isHandler', handlerRes.data.isHandler);
      uni.setStorageSync('handlerInfo', handlerRes.data.handler);

      // 7. 提示并跳转
      uni.showToast({
        title: '登录成功',
        icon: 'success',
      });

      setTimeout(() => {
        if (handlerRes.data.isHandler) {
          uni.reLaunch({ url: '/pages/handler/index' });
        } else {
          uni.reLaunch({ url: '/pages/index' });
        }
      }, 1000);
    } catch (error) {
      // 核销员检查失败，默认跳转首页
      uni.reLaunch({ url: '/pages/index' });
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
/* 登录容器 */
.login-container {
  min-height: 100vh;
  background: #F5FAFF;
  position: relative;
  display: flex;
  flex-direction: column;
}

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

/* 顶部栏背景 */
.top-bar-bg {
  background: rgba(245, 250, 255, 0.9);
}

/* Logo 图片 */
.logo-image {
  width: 200rpx;
  height: 80rpx;
}

/* 主内容区域 */
.login-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 60rpx;
}

/* 登录头部 */
.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

/* 品牌徽章 */
.brand-badge {
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

.brand-icon {
  font-size: 48px;
}

/* 标题 */
.title {
  font-size: 48rpx;
  margin-bottom: 16rpx;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  font-weight: 500;
  display: block;
}

/* 微信登录按钮 */
.wechat-login-btn {
  width: 100%;
  height: 96rpx;
  background: #00AEEF;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 174, 239, 0.25);
  border: none;
  margin-bottom: 40rpx;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
  }
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.btn-icon {
  font-size: 32px;
  color: #ffffff;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

/* 分割线 */
.divider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.divider-line {
  flex: 1;
  height: 2rpx;
  background: rgba(189, 200, 209, 0.3);
}

.divider-text {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.8);
  font-weight: 500;
}

/* 功能说明 */
.features {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 60rpx;
}

.feature-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24rpx;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(23, 28, 32, 0.03);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

.feature-icon {
  font-size: 32px;
}

.feature-text {
  font-size: 28rpx;
  color: rgba(110, 120, 129, 1);
  font-weight: 500;
}

/* 底部协议 */
.footer {
  position: fixed;
  bottom: 40rpx;
  left: 0;
  right: 0;
  text-align: center;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tip {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.6);
  font-weight: 500;
}

.link {
  font-size: 24rpx;
  color: #00AEEF;
  font-weight: 600;
}
</style>
