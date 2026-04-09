import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/services/redis.service';

/**
 * 券模板销售期过期处理服务
 *
 * 职责：
 * - 查询销售期过期的券模板（validUntil < now）
 * - 批量更新券模板状态为 EXPIRED（已停止销售）
 */
@Injectable()
export class CouponTemplateExpirationService {
  private readonly logger = new Logger(CouponTemplateExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 处理过期券模板
   *
   * 流程：
   * 1. 获取分布式锁
   * 2. 查询销售期过期的券模板
   * 3. 批量更新状态为 EXPIRED
   * 4. 释放锁
   */
  async handleExpiredTemplates() {
    // 1. 获取分布式锁
    const lock = await this.redisService.acquireLock(
      'scheduler:coupon-template-expiration',
      60000, // 60秒
    );

    if (!lock) {
      this.logger.warn('券模板过期任务正在其他实例执行');
      return;
    }

    try {
      // 2. 查询销售期过期的券模板
      // 注意：validUntil 是销售截止时间，不是使用截止时间
      const now = new Date();
      const expiredTemplates = await this.prisma.couponTemplate.findMany({
        where: {
          status: 'ACTIVE',
          validUntil: {
            lt: now,
          },
        },
        select: {
          id: true,
          title: true,
          validUntil: true,
        },
      });

      if (expiredTemplates.length === 0) {
        this.logger.debug('没有需要处理的过期券模板');
        return;
      }

      // 3. 批量更新状态为 EXPIRED（已停止销售）
      await this.prisma.couponTemplate.updateMany({
        where: {
          id: {
            in: expiredTemplates.map((t) => t.id),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.log(
        `已将 ${expiredTemplates.length} 个券模板标记为停止销售`,
      );

      // 记录详细信息
      expiredTemplates.forEach((template) => {
        this.logger.debug(
          `券模板已过期: ${template.title} (ID: ${template.id}, 销售截止: ${template.validUntil})`,
        );
      });
    } catch (error) {
      this.logger.error('处理过期券模板失败', error);
      throw error;
    } finally {
      // 4. 释放锁
      await this.redisService.releaseLock(
        'scheduler:coupon-template-expiration',
        lock,
      );
    }
  }
}