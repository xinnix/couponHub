/**
 * 用户相关 API
 */
import { http } from '@/utils/http'
import { API_ENDPOINTS } from '@/config/api'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  email: string
  password: string
}

export interface UserInfo {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string
}

export interface WechatLoginResponse {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  /**
   * 用户登录
   */
  login: (params: LoginParams) => {
    return http.post<AuthResponse>(API_ENDPOINTS.login, params)
  },

  /**
   * 用户注册
   */
  register: (params: RegisterParams) => {
    return http.post<AuthResponse>(API_ENDPOINTS.register, params)
  },

  /**
   * 用户登出
   */
  logout: (refreshToken?: string) => {
    return http.post(API_ENDPOINTS.logout, {
      refreshToken: refreshToken || uni.getStorageSync('refreshToken') || '',
    })
  },

  /**
   * 获取用户信息
   */
  getProfile: () => {
    return http.get<UserInfo>(API_ENDPOINTS.profile)
  },

  /**
   * 微信登录
   */
  wechatLogin: (code: string) =>
    http.post<WechatLoginResponse>(API_ENDPOINTS.wechatLogin, { code }),

  /**
   * 获取微信手机号
   */
  getPhoneNumber: (code: string) =>
    http.post(API_ENDPOINTS.getPhoneNumber, { code }),

  /**
   * 检查核销员身份
   */
  checkHandlerStatus: () => http.get(API_ENDPOINTS.checkHandlerStatus),
}
