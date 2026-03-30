import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import WxPay from 'wechatpay-node-v3';

/**
 * 微信支付服务（V3 API）
 *
 * 功能：
 * - JSAPI 下单（小程序支付）
 * - 生成小程序支付参数
 * - 处理支付回调通知
 * - 发起退款
 * - 查询订单状态
 *
 * 配置要求：
 * - WX_PAY_APP_ID: 小程序 AppID
 * - WX_PAY_MCH_ID: 商户号
 * - WX_PAY_API_KEY: API v3 密钥
 * - WX_PAY_SERIAL_NO: 商户 API 证书序列号
 * - WX_PAY_PRIVATE_KEY_PATH: 商户私钥路径
 * - WX_PAY_NOTIFY_URL: 回调通知 URL
 */
@Injectable()
export class WechatPayService implements OnModuleInit {
  private readonly logger = new Logger(WechatPayService.name);
  private wxpay: WxPay | null = null;
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiKey: string;
  private readonly serialNo: string;
  private readonly privateKeyPath: string;
  private readonly notifyUrl: string;
  private readonly sandbox: boolean;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('WX_PAY_APP_ID') || '';
    this.mchId = this.configService.get<string>('WX_PAY_MCH_ID') || '';
    this.apiKey = this.configService.get<string>('WX_PAY_API_KEY') || '';
    this.serialNo = this.configService.get<string>('WX_PAY_SERIAL_NO') || '';
    this.privateKeyPath =
      this.configService.get<string>('WX_PAY_PRIVATE_KEY_PATH') || '';
    this.notifyUrl =
      this.configService.get<string>('WX_PAY_NOTIFY_URL') || '';
    this.sandbox =
      this.configService.get<string>('WX_PAY_SANDBOX') === 'true';
  }

  onModuleInit() {
    if (!this.appId || !this.mchId || !this.apiKey || !this.serialNo) {
      this.logger.warn(
        '微信支付配置不完整（缺少 WX_PAY_APP_ID / WX_PAY_MCH_ID / WX_PAY_API_KEY / WX_PAY_SERIAL_NO），支付功能将不可用',
      );
      return;
    }

    const privateKey = this.readPrivateKey();
    if (!privateKey) {
      this.logger.warn(
        `微信支付私钥文件不存在或为空: ${this.privateKeyPath}`,
      );
      return;
    }

    this.wxpay = new WxPay({
      appid: this.appId,
      mchid: this.mchId,
      publicKey: null as any, // 平台证书，首次使用会自动下载
      privateKey: privateKey as any,
      key: this.apiKey,
      serial_no: this.serialNo,
    });

    this.isConfigured = true;
    this.logger.log(
      `微信支付 V3 初始化成功 | 商户号: ${this.mchId} | 沙箱: ${this.sandbox}`,
    );
  }

  /**
   * 读取商户私钥文件
   */
  private readPrivateKey(): string | null {
    try {
      const resolvedPath = path.resolve(this.privateKeyPath);
      if (!fs.existsSync(resolvedPath)) {
        return null;
      }
      return fs.readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      this.logger.error('读取微信支付私钥失败', error);
      return null;
    }
  }

  /**
   * 检查支付是否已配置
   */
  private ensureConfigured() {
    if (!this.isConfigured || !this.wxpay) {
      throw new Error('微信支付未配置，请检查环境变量和证书文件');
    }
  }

  /**
   * JSAPI 下单（小程序支付）
   *
   * @returns prepay_id
   */
  async createOrder(params: {
    orderId: string;
    orderNo: string;
    amount: number;
    description: string;
    openid: string;
  }): Promise<string> {
    this.ensureConfigured();

    const { orderId, orderNo, amount, description, openid } = params;

    this.logger.log(
      `创建支付订单: ${orderNo}, 金额: ${amount}元, openid: ${openid.slice(0, 8)}...`,
    );

    const result: any = await this.wxpay!.transactions_jsapi({
      description,
      out_trade_no: orderNo,
      notify_url: this.notifyUrl,
      amount: {
        total: Math.round(amount * 100), // 微信支付金额单位为分
        currency: 'CNY',
      },
      payer: {
        openid,
      },
      // 附加数据，回调时原样返回
      attach: orderId,
    });

    const prepayId = result.prepay_id;
    this.logger.log(`预支付订单创建成功: ${prepayId}`);

    return prepayId;
  }

  /**
   * 生成小程序调起支付所需的参数
   *
   * @param prepayId 预支付订单 ID
   * @returns 小程序 wx.requestPayment 所需参数
   */
  getPayParams(prepayId: string): {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  } {
    this.ensureConfigured();

    const params: any = (this.wxpay as any).getPayParamsForJSAPI(prepayId);

    return {
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
    };
  }

  /**
   * 处理支付回调通知
   *
   * @param body 回调请求体（原始 JSON 字符串）
   * @param headers 请求头（包含微信签名信息）
   * @returns 解密后的支付结果
   */
  async handleCallback(
    body: string,
    headers: {
      'wechatpay-timestamp'?: string;
      'wechatpay-nonce'?: string;
      'wechatpay-signature'?: string;
      'wechatpay-serial'?: string;
    },
  ): Promise<{
    success: boolean;
    orderId: string;
    orderNo: string;
    transactionId: string;
    amount: number;
    paidAt: Date;
  }> {
    this.ensureConfigured();

    const { resource } = JSON.parse(body);

    // 解密回调数据
    const decrypted: string = (this.wxpay as any).decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      this.apiKey,
    );

    const payment = JSON.parse(decrypted);

    this.logger.log(
      `支付回调: 订单 ${payment.out_trade_no}, 交易号 ${payment.transaction_id}, 状态 ${payment.trade_state}`,
    );

    if (payment.trade_state !== 'SUCCESS') {
      this.logger.warn(`支付未成功: ${payment.trade_state}`);
      throw new Error(`支付状态非成功: ${payment.trade_state}`);
    }

    return {
      success: true,
      orderId: payment.attach, // 创建订单时传入的 orderId
      orderNo: payment.out_trade_no,
      transactionId: payment.transaction_id,
      amount: payment.amount.total, // 分
      paidAt: new Date(payment.success_time),
    };
  }

  /**
   * 发起退款
   */
  async refund(params: {
    orderNo: string;
    refundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason?: string;
  }): Promise<string> {
    this.ensureConfigured();

    const { orderNo, refundNo, totalAmount, refundAmount, reason } = params;

    this.logger.log(
      `发起退款: 订单 ${orderNo}, 退款 ${refundAmount}元, 原因: ${reason}`,
    );

    const result: any = await (this.wxpay as any).refunds({
      out_trade_no: orderNo,
      out_refund_no: refundNo,
      amount: {
        refund: Math.round(refundAmount * 100),
        total: Math.round(totalAmount * 100),
        currency: 'CNY',
      },
      reason: reason || '用户申请退款',
    });

    this.logger.log(`退款请求成功: 退款单号 ${refundNo}`);
    return result.refund_id;
  }

  /**
   * 查询订单支付状态
   */
  async queryOrder(orderNo: string): Promise<{
    status: 'SUCCESS' | 'NOTPAY' | 'CLOSED' | 'USERPAYING' | 'PAYERROR';
    transactionId?: string;
    paidAt?: Date;
  }> {
    this.ensureConfigured();

    this.logger.log(`查询订单支付状态: ${orderNo}`);

    const result: any = await (this.wxpay as any).query({
      out_trade_no: orderNo,
    });

    return {
      status: result.trade_state as any,
      transactionId: result.transaction_id,
      paidAt: result.success_time
        ? new Date(result.success_time)
        : undefined,
    };
  }
}
