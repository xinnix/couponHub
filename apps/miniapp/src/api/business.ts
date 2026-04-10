import http from '../utils/http';

/**
 * 商户 API
 */
export const merchantApi = {
  /**
   * 获取商户列表
   */
  getList: (params?: any) => {
    return http.get('/merchants', params);
  },

  /**
   * 获取商户详情
   */
  getDetail: (id: string) => {
    return http.get(`/merchants/${id}`);
  },

  /**
   * 获取商户分类列表
   */
  getCategories: () => {
    return http.get('/merchants/categories');
  },
};

/**
 * 新闻 API
 */
export const newsApi = {
  /**
   * 获取新闻列表
   */
  getList: (params?: any) => {
    return http.get('/news', params);
  },

  /**
   * 获取新闻详情
   */
  getDetail: (id: string) => {
    return http.get(`/news/${id}`);
  },
};

/**
 * 券模板 API
 */
export const couponApi = {
  /**
   * 获取券模板列表
   */
  getList: (params?: any) => {
    return http.get('/coupon-templates', params);
  },

  /**
   * 获取券模板详情
   */
  getDetail: (id: string) => {
    return http.get(`/coupon-templates/${id}`);
  },
};

/**
 * 订单 API
 */
export const orderApi = {
  /**
   * 创建订单
   */
  create: (data: { templateId: string }) => {
    return http.post('/orders', data);
  },

  /**
   * 获取我的订单列表
   */
  getMyOrders: (params?: { status?: string }) => {
    return http.get('/orders/my', params);
  },

  /**
   * 获取订单详情
   */
  getDetail: (id: string) => {
    return http.get(`/orders/${id}`);
  },

  /**
   * 生成订单核销二维码
   */
  generateQRCode: (orderId: string) => {
    return http.post(`/orders/${orderId}/qrcode`);
  },

  /**
   * 根据核销码获取订单信息（用于核销前确认）
   */
  getByCode: (code: string) => {
    return http.post('/orders/get-by-code', { code });
  },

  /**
   * 申请退款
   */
  requestRefund: (data: { orderId: string; reason: string }) => {
    return http.post('/orders/refund', data);
  },
};

/**
 * 支付 API
 */
export const paymentApi = {
  /**
   * 创建支付
   */
  create: (data: { orderId: string }) => {
    return http.post('/payments/create', data);
  },
};

/**
 * 核销 API
 */
export const redemptionApi = {
  /**
   * 扫码核销
   */
  redeem: (data: { code: string }) => {
    return http.post('/redemptions/redeem', data);
  },

  /**
   * 获取核销记录
   */
  getRecords: (params?: any) => {
    return http.get('/redemptions/records', params);
  },
};
