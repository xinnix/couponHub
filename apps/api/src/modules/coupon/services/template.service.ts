import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';
import { WechatService } from '../../wechat/wechat.service';
import { FileStorageService, UploadedFile } from '../../../shared/services/file-storage.service';
import { StockLogService, StockChangeReason } from './stock-log.service';

@Injectable()
export class TemplateService extends BaseService<'CouponTemplate'> {
  constructor(
    prisma: PrismaService,
    private wechatService: WechatService,
    private fileStorage: FileStorageService,
    private stockLogService: StockLogService,
  ) {
    super(prisma, 'CouponTemplate');
  }

  /**
   * 手动调整库存
   *
   * @param templateId 券模板 ID
   * @param amount 调整数量（正数=增加，负数=减少）
   * @param adminId 操作员 ID
   * @param reason 调整原因说明
   */
  async adjustStock(
    templateId: string,
    amount: number,
    adminId: string,
    reason: string,
  ) {
    // 1. 查询券模板
    const template = await this.getOneOrThrow(templateId);

    // 2. 验证调整后的库存不能为负数
    const newStock = template.stock + amount;
    if (newStock < 0) {
      throw new BadRequestException(
        `库存调整失败：当前库存 ${template.stock}, 调整数量 ${amount}, 调整后库存将为 ${newStock}（不能为负数）`,
      );
    }

    // 3. 更新库存
    const updatedTemplate = await this.prisma.couponTemplate.update({
      where: { id: templateId },
      data: {
        stock: newStock,
        // 如果之前是售罄状态（DISABLED），库存恢复后改为 ACTIVE
        ...(template.status === 'DISABLED' && newStock > 0 && { status: 'ACTIVE' }),
        // 如果库存调整为 0，自动标记为售罄
        ...(newStock === 0 && { status: 'DISABLED' }),
      },
    });

    // 4. 记录库存变更日志
    await this.stockLogService.log(
      templateId,
      amount,
      updatedTemplate.stock,
      StockChangeReason.MANUAL_ADJUST,
      undefined,
      adminId,
      { reason, previousStock: template.stock },
    );

    return updatedTemplate;
  }

  /**
   * 生成小程序码
   */
  async generateQrcode(templateId: string): Promise<{ url: string }> {
    // 1. 检查模板是否存在
    const template = await this.getOneOrThrow(templateId);

    // 2. 生成小程序码图片
    const imageBuffer = await this.wechatService.generateMiniProgramCode(
      templateId,
      'pages/coupon/detail',
    );

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
   * 根据商户 ID 查询可用的优惠券模板
   */
  async findByMerchantId(merchantId: string) {
    // 使用 Prisma 的 JSON 数组查询
    // merchantScope 是一个 JSON 字符串数组，例如 ["merchantId1", "merchantId2"]
    const templates = await this.prisma.couponTemplate.findMany({
      where: {
        status: 'ACTIVE',
        // 使用 JSON path 查询：数组是否包含某个字符串
        // Prisma 的 JSON 查询语法：array_contains 或 array_ends_with 等
        // 但对于字符串数组，我们需要检查数组中是否有某个元素
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 手动过滤：检查 merchantScope 数组是否包含 merchantId
    // 空数组表示全商户可用
    return templates.filter((template) => {
      const scope = template.merchantScope as string[];
      return Array.isArray(scope) && (scope.length === 0 || scope.includes(merchantId));
    });
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
          shopNumber: true,
          phone: true,
          description: true,
          businessHours: true,
          sortOrder: true,
          status: true,
        },
      });

      // 将商户信息附加到返回数据
      // 默认返回第一个商户作为主要商户（用于优惠券详情页展示）
      return {
        ...template,
        merchant: merchants.length > 0 ? merchants[0] : null,
        merchants: merchants, // 所有适用商户列表
        isAllMerchants: false, // 标记：非全商户可用
      };
    }

    // 空数组表示全商户可用
    return {
      ...template,
      merchants: [], // 空数组，小程序端会显示"全商户可用"
      isAllMerchants: true, // 标记：全商户可用
    };
  }
}