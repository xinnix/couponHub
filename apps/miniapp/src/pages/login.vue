<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">欢迎使用小程序</text>
    </view>

    <button
      class="wechat-login-btn"
      open-type="getPhoneNumber"
      @getphonenumber="handleWechatLogin"
      :loading="loading"
    >
      <text class="btn-text">微信一键登录</text>
    </button>

    <view class="footer">
      <text class="tip">登录即表示同意《用户协议》和《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '@/api/auth';

const loading = ref(false);

const handleWechatLogin = async () => {
  loading.value = true;

  try {
    // 1. 获取微信 code
    const loginRes = await uni.login({ provider: 'weixin' });

    // uni.login 成功返回格式: { code, errMsg }
    const code = loginRes.code;

    if (!code) {
      throw new Error('获取登录凭证失败');
    }

    // 2. 发送到后端
    const res = await authApi.wechatLogin(code);

    // 3. 存储 token
    uni.setStorageSync('token', res.data.accessToken);
    uni.setStorageSync('refreshToken', res.data.refreshToken);
    uni.setStorageSync('userInfo', res.data.user);

    // 4. 提示并跳转
    uni.showToast({
      title: '登录成功',
      icon: 'success',
    });

    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index' });
    }, 1000);
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

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 40rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.wechat-login-btn {
  width: 600rpx;
  height: 88rpx;
  background: #07c160;
  color: #ffffff;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-text {
  color: #ffffff;
}

.footer {
  position: fixed;
  bottom: 60rpx;
  text-align: center;
}

.tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}
</style>
