<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { authApi } from '@/api/auth'

definePage({
  type: 'home',
})

// 状态
const isLoggedIn = ref(false)
const userInfo = ref<any>(null)

// 测试账号 (小程序用户)
const testAccounts = [
  { role: '普通用户', email: 'user@example.com', password: 'password123' },
  { role: '普通用户2', email: 'user2@example.com', password: 'password123' },
]

// 检查登录状态
function checkLoginStatus() {
  const token = uni.getStorageSync('token')
  const user = uni.getStorageSync('userInfo')
  isLoggedIn.value = !!token
  userInfo.value = user
}

// 跳转到登录页
function goToLogin() {
  uni.navigateTo({ url: '/pages/login' })
}

// 跳转到 Todo 页面
function goToTodo() {
  if (!isLoggedIn.value) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再访问 Todo List',
      showCancel: false,
    })
    return
  }
  uni.navigateTo({
    url: '/pages/todo',
  })
}

// 快速登录
async function quickLogin(account: typeof testAccounts[0]) {
  try {
    uni.showLoading({ title: '登录中...' })

    const res = await uni.request({
      url: 'http://localhost:3000/api/auth/login',
      method: 'POST',
      data: {
        email: account.email,
        password: account.password,
      },
    })

    uni.hideLoading()

    if (res.statusCode === 200 && res.data) {
      const data = res.data as any
      if (data.success) {
        // 保存 token 和用户信息
        uni.setStorageSync('token', data.data.accessToken)
        uni.setStorageSync('refreshToken', data.data.refreshToken)
        uni.setStorageSync('userInfo', data.data.user)

        isLoggedIn.value = true
        userInfo.value = data.data.user

        uni.showToast({
          title: '登录成功',
          icon: 'success',
        })
      }
      else {
        throw new Error(data.message || '登录失败')
      }
    }
    else {
      throw new Error('登录失败')
    }
  }
  catch (error: any) {
    uni.hideLoading()
    console.error('登录失败:', error)
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none',
    })
  }
}

// 退出登录
async function logout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '退出中...' })

          // 调用后端 logout API
          const refreshToken = uni.getStorageSync('refreshToken')
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }

          uni.hideLoading()

          // 清空本地存储
          uni.removeStorageSync('token')
          uni.removeStorageSync('refreshToken')
          uni.removeStorageSync('userInfo')

          // 更新状态
          isLoggedIn.value = false
          userInfo.value = null

          uni.showToast({
            title: '已退出登录',
            icon: 'success',
          })
        } catch (error: any) {
          uni.hideLoading()
          console.error('退出失败:', error)
          // 即使 API 调用失败，也清空本地状态
          uni.removeStorageSync('token')
          uni.removeStorageSync('refreshToken')
          uni.removeStorageSync('userInfo')
          isLoggedIn.value = false
          userInfo.value = null
          uni.showToast({
            title: '已退出登录',
            icon: 'success',
          })
        }
      }
    },
  })
}

// 页面加载
onMounted(() => {
  checkLoginStatus()
})
</script>

<template>
  <view class="home-container">
    <!-- 头部区域 -->
    <view class="header">
      <view class="header-bg" />
      <view class="header-content">
        <text class="app-name">
          OpenCode
        </text>
        <text class="app-desc">
          全栈开发模板
        </text>
      </view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view v-if="isLoggedIn && userInfo" class="user-info">
        <view class="avatar">
          <text class="avatar-text">
            {{ userInfo.username?.charAt(0).toUpperCase() || 'U' }}
          </text>
        </view>
        <view class="info">
          <text class="username">
            {{ userInfo.username }}
          </text>
          <text class="email">
            {{ userInfo.email }}
          </text>
        </view>
        <button class="logout-btn" @click="logout">
          退出
        </button>
      </view>
      <view v-else class="login-tip">
        <text class="tip-text">
          未登录，请点击下方按钮登录
        </text>
        <button class="go-login-btn" @click="goToLogin">
          去登录
        </button>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="feature-section">
      <text class="section-title">
        功能入口
      </text>

      <view class="feature-card" @click="goToTodo">
        <view class="card-icon">
          📋
        </view>
        <view class="card-content">
          <text class="card-title">
            Todo List
          </text>
          <text class="card-desc">
            管理待办事项，测试 CRUD 操作
          </text>
        </view>
        <view class="card-arrow">
          <text>→</text>
        </view>
      </view>
    </view>

    <!-- 测试账号 -->
    <view class="test-section">
      <text class="section-title">
        测试账号 (点击快速登录)
      </text>

      <view class="account-list">
        <view v-for="(account, index) in testAccounts" :key="index" class="account-card" @click="quickLogin(account)">
          <view class="account-info">
            <text class="account-role">
              {{ account.role }}
            </text>
            <text class="account-email">
              {{ account.email }}
            </text>
          </view>
          <view class="login-btn">
            <text>登录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 开发说明 -->
    <view class="dev-info">
      <text class="info-title">
        开发说明
      </text>
      <text class="info-text">
        • 后端 API: http://localhost:3000/api
      </text>
      <text class="info-text">
        • Todo 功能需要登录后访问
      </text>
      <text class="info-text">
        • 使用测试账号快速体验完整功能
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40rpx;
}

.header {
  position: relative;
  height: 280rpx;
  margin-bottom: 20rpx;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .header-content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .app-name {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
      margin-bottom: 12rpx;
    }

    .app-desc {
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

.user-card {
  margin: -60rpx 30rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;

  .user-info {
    display: flex;
    align-items: center;

    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;

      .avatar-text {
        font-size: 36rpx;
        font-weight: bold;
        color: #fff;
      }
    }

    .info {
      flex: 1;

      .username {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }

      .email {
        font-size: 24rpx;
        color: #999;
      }
    }

    .logout-btn {
      padding: 12rpx 24rpx;
      background: #f5f5f5;
      color: #666;
      border-radius: 8rpx;
      font-size: 26rpx;
      border: none;
    }
  }

  .login-tip {
    text-align: center;
    padding: 20rpx 0;

    .tip-text {
      display: block;
      font-size: 28rpx;
      color: #999;
      margin-bottom: 20rpx;
    }

    .go-login-btn {
      padding: 16rpx 48rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border-radius: 8rpx;
      font-size: 28rpx;
      border: none;
    }
  }
}

.feature-section {
  margin: 30rpx;

  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }

  .feature-card {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
    transition: all 0.3s;

    &:active {
      transform: scale(0.98);
      opacity: 0.9;
    }

    .card-icon {
      font-size: 60rpx;
      margin-right: 24rpx;
    }

    .card-content {
      flex: 1;

      .card-title {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }

      .card-desc {
        font-size: 24rpx;
        color: #999;
      }
    }

    .card-arrow {
      font-size: 40rpx;
      color: #ddd;
    }
  }
}

.test-section {
  margin: 30rpx;

  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }

  .account-list {
    .account-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      border-radius: 12rpx;
      padding: 24rpx;
      margin-bottom: 16rpx;
      box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
      transition: all 0.3s;

      &:active {
        transform: scale(0.98);
        opacity: 0.9;
      }

      .account-info {
        flex: 1;

        .account-role {
          display: block;
          font-size: 28rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 8rpx;
        }

        .account-email {
          font-size: 24rpx;
          color: #666;
        }
      }

      .login-btn {
        padding: 12rpx 32rpx;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8rpx;
        color: #fff;
        font-size: 26rpx;
      }
    }
  }
}

.dev-info {
  margin: 30rpx;
  padding: 30rpx;
  background: #fff9e6;
  border-radius: 12rpx;
  border-left: 4rpx solid #faad14;

  .info-title {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #d48806;
    margin-bottom: 16rpx;
  }

  .info-text {
    display: block;
    font-size: 24rpx;
    color: #d48806;
    line-height: 1.8;
  }
}
</style>
