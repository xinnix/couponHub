/**
 * HTTP 请求工具
 * 基于 uni.request 封装
 */

import type { ApiConfig } from '@/config/api'
import { API_CONFIG } from '@/config/api'
import { showLoading, hideLoading } from '@/stores/loading'

interface RequestConfig {
  url: string
  method?: UniApp.RequestOptions['method']
  data?: UniApp.RequestOptions['data']
  header?: Record<string, string>
  timeout?: number
  /** 是否显示 loading，默认 true */
  showLoading?: boolean
  /** loading 文案 */
  loadingText?: string
}

interface Response<T = unknown> {
  success: boolean
  data: T
  message?: string
  total?: number // 总记录数（用于分页）
  page?: number // 当前页码
  pageSize?: number // 每页大小
  totalPages?: number // 总页数
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
    const { url, method = 'GET', data, header = {}, timeout, showLoading: shouldShowLoading = true, loadingText = '加载中...' } = config

    // ✅ 显示 loading（如果启用）
    if (shouldShowLoading) {
      showLoading(loadingText)
    }

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

            // 2. 隐藏 loading
            if (shouldShowLoading) {
              hideLoading()
            }

            // 3. 不弹窗，让页面自己处理未登录状态
            reject(res.data);
            return;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = res.data as Response<T>
            if (response.success !== false) {
              // ✅ 隐藏 loading
              if (shouldShowLoading) {
                hideLoading()
              }
              resolve(response)
            } else {
              // ✅ 隐藏 loading
              if (shouldShowLoading) {
                hideLoading()
              }
              // ❌ 移除自动 showToast，让页面自己处理
              reject(response)
            }
          } else {
            // ✅ 隐藏 loading
            if (shouldShowLoading) {
              hideLoading()
            }
            // ❌ 移除自动 showToast，让页面自己处理业务错误
            reject(res.data)
          }
        },
        fail: (err) => {
          // ✅ 隐藏 loading
          if (shouldShowLoading) {
            hideLoading()
          }
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
  get<T = unknown>(url: string, data?: UniApp.RequestOptions['data'], config?: Partial<RequestConfig>): Promise<Response<T>> {
    return this.request<T>({ url, method: 'GET', data, ...config })
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, data?: UniApp.RequestOptions['data'], config?: Partial<RequestConfig>): Promise<Response<T>> {
    return this.request<T>({ url, method: 'POST', data, ...config })
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, data?: UniApp.RequestOptions['data'], config?: Partial<RequestConfig>): Promise<Response<T>> {
    return this.request<T>({ url, method: 'PUT', data, ...config })
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, data?: UniApp.RequestOptions['data'], config?: Partial<RequestConfig>): Promise<Response<T>> {
    return this.request<T>({ url, method: 'DELETE', data, ...config })
  }
}

export const http = new HttpClient()
export default http
