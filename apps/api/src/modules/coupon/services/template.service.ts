import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';
import { WechatService } from '../../wechat/wechat.service';
import { FileStorageService, UploadedFile } from '../../../shared/services/file-storage.service';

@Injectable()
export class TemplateService extends BaseService<'CouponTemplate'> {
  constructor(
    prisma: PrismaService,
    private wechatService: WechatService,
    private fileStorage: FileStorageService,
  ) {
    super(prisma, 'CouponTemplate');
  }

  /**
   * 生成小程序码
   */
  async generateQrcode(templateId: string): Promise<{ url: string }> {
    // 1. 检查模板是否存在
    const template = await this.getOneOrThrow(templateId);

    // 2. 生成小程序码图片
    const imageBuffer = await this.wechatService.generateMiniProgramCode(templateId);

    // 3. 上传到文件存储
    const file: UploadedFile = {
      fieldname: 'qrcode',
      originalname: `qrcode-${templateId}.png`,
      encoding: '7bit',
      mimetype: 'image/png',
      size: imageBuffer.length,
      buffer: imageBuffer,
    };

    const uploadResult = await this.fileStorage.upload(file, 'qrcodes');

    // 4. 更新模板记录
    await this.update(templateId, {
      qrcodeUrl: uploadResult.url,
      qrcodeGeneratedAt: new Date(),
    });

    return { url: uploadResult.url };
  }

  /**
   * 获取或生成小程序码
   */
  async getOrGenerateQrcode(templateId: string): Promise<{ url: string }> {
    const template = await this.getOneOrThrow(templateId);

    // 如果已有小程序码，直接返回
    if (template.qrcodeUrl) {
      return { url: template.qrcodeUrl };
    }

    // 否则生成新的
    return this.generateQrcode(templateId);
  }

  /**
   * 获取优惠券模板详情，包含商户信息
   */
  async getDetailWithMerchants(templateId: string) {
    const template = await this.getOne(templateId);

    if (!template) {
      return null;
    }

    // 如果有 merchantScope（商户ID数组），查询商户信息
    if (template.merchantScope && Array.isArray(template.merchantScope) && template.merchantScope.length > 0) {
      const merchantIds = template.merchantScope;
      const merchants = await this.prisma.merchant.findMany({
        where: { id: { in: merchantIds } },
        select: {
          id: true,
          name: true,
          logo: true,
          area: true,
          floor: true,
          phone: true,
          description: true,
          status: true,
        },
      });

      // 将商户信息附加到返回数据
      // 默认返回第一个商户作为主要商户（用于优惠券详情页展示）
      return {
        ...template,
        merchant: merchants.length > 0 ? merchants[0] : null,
        merchants: merchants, // 所有适用商户列表
      };
    }

    return template;
  }
}