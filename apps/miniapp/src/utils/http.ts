/**
 * HTTP 请求工具
 * 基于 uni.request 封装
 */

import type { ApiConfig } from '@/config/api'
import { API_CONFIG } from '@/config/api'

interface RequestConfig {
  url: string
  method?: UniApp.RequestOptions['method']
  data?: UniApp.RequestOptions['data']
  header?: Record<string, string>
  timeout?: number
}

interface Response<T = unknown> {
  success: boolean
  data: T
  message?: string
}

class HttpClient {
  private config: ApiConfig

  constructor() {
    this.config = API_CONFIG
  }

  /**
   * 获取 token
   */
  private getToken(): string {
    return uni.getStorageSync('token') || ''
  }

  /**
   * 通用请求方法
   */
  private request<T = unknown>(config: RequestConfig): Promise<Response<T>> {
    const { url, method = 'GET', data, header = {}, timeout } = config

    return new Promise((resolve, reject) => {
      uni.request({
        url: this.config.baseURL + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : '',
          ...header,
        },
        timeout: timeout || this.config.timeout,
        success: (res) => {
          // ✅ 处理 401 未授权错误
          if (res.statusCode === 401) {
            // 1. 清除本地存储
            uni.removeStorageSync('token');
            uni.removeStorageSync('refreshToken');
            uni.removeStorageSync('userInfo');

            // 2. 提示用户
            uni.showModal({
              title: '登录已过期',
              content: '请重新登录',
              showCancel: false,
              success: () => {
                // 3. 跳转到登录页
                uni.reLaunch({ url: '/pages/login' });
              },
            });

            reject(res.data);
            return;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = res.data as Response<T>
            if (response.success !== false) {
              resolve(response)
            } else {
              uni.showToast({
                title: response.message || '请求失败',
                icon: 'none',
              })
              reject(response)
            }
          } else {
            const response = res.data as Response
            uni.showToast({
              title: response.message || '请求失败',
              icon: 'none',
            })
            reject(res.data)
          }
        },
        fail: (err) => {
          uni.showToast({
            title: '网络请求失败',
            icon: 'none',
          })
          reject(err)
        },
      })
    })
  }

  /**
   * GET 请求
   */
  get<T = unknown>(url: string, data?: UniApp.RequestOptions['data']): Promise<Response<T>> {
    return this.request<T>({ url, method: 'GET', data })
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, data?: UniApp.RequestOptions['data']): Promise<Response<T>> {
    return this.request<T>({ url, method: 'POST', data })
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, data?: UniApp.RequestOptions['data']): Promise<Response<T>> {
    return this.request<T>({ url, method: 'PUT', data })
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, data?: UniApp.RequestOptions['data']): Promise<Response<T>> {
    return this.request<T>({ url, method: 'DELETE', data })
  }
}

export const http = new HttpClient()
export default http
