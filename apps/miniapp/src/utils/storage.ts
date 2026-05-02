/**
 * 小程序存储管理工具
 *
 * 功能：
 * - 统一管理 token 存储
 * - 自动清理过期数据
 * - 提供安全的存储接口
 */

interface StorageData {
  token: string
  refreshToken: string
  userInfo: any
  expiresAt?: number  // 可选：本地过期时间戳
}

/**
 * 存储 token（带本地过期时间）
 */
export function setTokens(accessToken: string, refreshToken: string, expiresInDays: number = 7) {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000

  uni.setStorageSync('token', accessToken)
  uni.setStorageSync('refreshToken', refreshToken)
  uni.setStorageSync('tokenExpiresAt', expiresAt)  // 本地过期时间
}

/**
 * 获取 token（自动检查本地过期）
 */
export function getToken(): string | null {
  const token = uni.getStorageSync('token')
  const expiresAt = uni.getStorageSync('tokenExpiresAt')

  // 如果本地已过期，提前触发刷新（优化用户体验）
  if (expiresAt && Date.now() > expiresAt) {
    console.log('[Storage] Token 本地已过期，建议刷新')
    // ⚠️ 不自动清除，让 HTTP 拦截器处理刷新
    return token  // 返回旧 token，触发 401 刷新流程
  }

  return token || null
}

/**
 * 获取 refresh token
 */
export function getRefreshToken(): string | null {
  return uni.getStorageSync('refreshToken') || null
}

/**
 * 清除所有认证数据
 */
export function clearAuth() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
  uni.removeStorageSync('tokenExpiresAt')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('isHandler')
  uni.removeStorageSync('handlerInfo')
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken() && !!getRefreshToken()
}

/**
 * 更新 userInfo
 */
export function setUserInfo(userInfo: any) {
  uni.setStorageSync('userInfo', userInfo)
}

/**
 * 获取 userInfo
 */
export function getUserInfo(): any | null {
  return uni.getStorageSync('userInfo') || null
}

/**
 * 设置核销员信息
 */
export function setHandlerInfo(isHandler: boolean, handlerInfo?: any) {
  uni.setStorageSync('isHandler', isHandler)
  if (handlerInfo) {
    uni.setStorageSync('handlerInfo', handlerInfo)
  } else {
    uni.removeStorageSync('handlerInfo')
  }
}

/**
 * 获取核销员信息
 */
export function getHandlerInfo(): { isHandler: boolean; handlerInfo: any | null } {
  const isHandler = uni.getStorageSync('isHandler') || false
  const handlerInfo = uni.getStorageSync('handlerInfo') || null
  return { isHandler, handlerInfo }
}