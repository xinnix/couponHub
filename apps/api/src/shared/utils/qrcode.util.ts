import * as crypto from 'crypto';

/**
 * 二维码配置
 */
const QRCODE_SECRET = process.env.QRCODE_SECRET || 'your-secret-key-change-in-production';
const QRCODE_EXPIRE_TIME = 300000; // 5分钟（300秒），给用户和核销员足够时间

/**
 * 生成核销二维码
 *
 * 格式：orderId:timestamp:signature
 *
 * @param orderId 订单 ID
 * @returns 二维码内容
 */
export function generateRedeemCode(orderId: string): string {
  const timestamp = Date.now();
  const payload = `${orderId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', QRCODE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 8);

  return `${orderId}:${timestamp}:${signature}`;
}

/**
 * 验证核销二维码
 *
 * @param code 二维码内容
 * @returns 验证结果
 */
export function verifyRedeemCode(code: string): {
  orderId: string;
  timestamp: number;
  valid: boolean;
  reason?: string;
} {
  const parts = code.split(':');
  if (parts.length !== 3) {
    return { orderId: '', timestamp: 0, valid: false, reason: '二维码格式错误' };
  }

  const [orderId, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // 验证时间戳
  if (isNaN(timestamp)) {
    return { orderId, timestamp: 0, valid: false, reason: '时间戳无效' };
  }

  // 验证有效期（30秒）
  const now = Date.now();
  if (now - timestamp > QRCODE_EXPIRE_TIME) {
    return { orderId, timestamp, valid: false, reason: '二维码已过期' };
  }

  // 验证签名
  const payload = `${orderId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', QRCODE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 8);

  if (signature !== expectedSignature) {
    return { orderId, timestamp, valid: false, reason: '签名验证失败' };
  }

  return { orderId, timestamp, valid: true };
}

/**
 * 生成订单号
 * 格式：年月日时分秒 + 6位随机数
 */
export function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}