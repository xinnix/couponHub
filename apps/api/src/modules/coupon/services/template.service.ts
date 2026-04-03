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
}