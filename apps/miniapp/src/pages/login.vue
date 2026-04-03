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
