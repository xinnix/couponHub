import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface WechatSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('WX_APP_ID')!;
    this.appSecret = this.configService.get<string>('WX_APP_SECRET')!;
  }

  /**
   * 通过 code 换取 openid 和 session_key
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  async code2Session(code: string): Promise<{
    openid: string;
    sessionKey: string;
    unionid?: string;
  }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data: WechatSessionResponse = await response.json();

      if (data.errcode) {
        throw new Error(`微信登录失败: ${data.errmsg}`);
      }

      return {
        openid: data.openid,
        sessionKey: data.session_key,
        unionid: data.unionid,
      };
    } catch (error) {
      this.logger.error('微信 code2Session 失败', error);
      throw error;
    }
  }

  /**
   * 解密微信手机号数据
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html#%E5%8A%A0%E5%AF%86%E6%95%B0%E6%8D%AE%E8%A7%A3%E5%AF%86%E7%AE%97%E6%B3%95
   */
  async decryptPhoneNumber(
    encryptedData: string,
    iv: string,
    sessionKey: string,
  ): Promise<{ phoneNumber: string; watermark: any }> {
    const crypto = require('crypto');

    try {
      const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        Buffer.from(sessionKey, 'base64'),
        Buffer.from(iv, 'base64'),
      );

      let decoded = decipher.update(Buffer.from(encryptedData, 'base64'));
      decoded = Buffer.concat([decoded, decipher.final()]);

      const data = JSON.parse(decoded.toString());

      // 验证 watermark
      if (data.watermark.appid !== this.appId) {
        throw new Error('水印验证失败：appid 不匹配');
      }

      return {
        phoneNumber: data.phoneNumber,
        watermark: data.watermark,
      };
    } catch (error) {
      this.logger.error('手机号解密失败', error);
      throw new Error('手机号解密失败');
    }
  }
}