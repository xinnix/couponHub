import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * 订单状态定义
 */
export enum OrderStatus {
  UNPAID = 'UNPAID',       // 待支付
  PAID = 'PAID',           // 已支付/待使用
  REDEEMED = 'REDEEMED',   // 已核销
  REFUNDING = 'REFUNDING', // 退款中
  REFUNDED = 'REFUNDED',   // 已退款
  EXPIRED = 'EXPIRED',     // 已过期
}

/**
 * 订单状态流转规则
 */
const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.UNPAID]: [OrderStatus.PAID, OrderStatus.EXPIRED],
  [OrderStatus.PAID]: [OrderStatus.REDEEMED, OrderStatus.REFUNDING, OrderStatus.EXPIRED],
  [OrderStatus.REDEEMED]: [],
  [OrderStatus.REFUNDING]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.EXPIRED]: [],
};

/**
 * 订单状态机服务
 *
 * 管理订单状态的流转，确保状态变更符合业务规则。
 */
@Injectable()
export class OrderStateMachineService {
  /**
   * 验证状态流转是否合法
   *
   * @param currentStatus 当前状态
   * @param targetStatus 目标状态
   * @throws BadRequestException 如果状态流转不合法
   */
  validateTransition(
    currentStatus: OrderStatus | string,
    targetStatus: OrderStatus | string,
  ): void {
    const current = currentStatus as OrderStatus;
    const target = targetStatus as OrderStatus;

    if (!Object.values(OrderStatus).includes(current)) {
      throw new BadRequestException(`无效的订单状态: ${currentStatus}`);
    }

    if (!Object.values(OrderStatus).includes(target)) {
      throw new BadRequestException(`无效的订单状态: ${targetStatus}`);
    }

    const allowedTransitions = ORDER_STATE_TRANSITIONS[current];
    if (!allowedTransitions.includes(target)) {
      throw new BadRequestException(
        `订单状态不能从 ${current} 转换为 ${target}`,
      );
    }
  }

  /**
   * 检查是否可以退款
   */
  canRefund(status: OrderStatus | string): boolean {
    const s = status as OrderStatus;
    return s === OrderStatus.PAID;
  }

  /**
   * 检查是否可以核销
   */
  canRedeem(status: OrderStatus | string): boolean {
    const s = status as OrderStatus;
    return s === OrderStatus.PAID;
  }

  /**
   * 检查是否可以支付
   */
  canPay(status: OrderStatus | string): boolean {
    const s = status as OrderStatus;
    return s === OrderStatus.UNPAID;
  }

  /**
   * 获取状态描述
   */
  getStatusDescription(status: OrderStatus | string): string {
    const descriptions: Record<OrderStatus, string> = {
      [OrderStatus.UNPAID]: '待支付',
      [OrderStatus.PAID]: '待使用',
      [OrderStatus.REDEEMED]: '已核销',
      [OrderStatus.REFUNDING]: '退款中',
      [OrderStatus.REFUNDED]: '已退款',
      [OrderStatus.EXPIRED]: '已过期',
    };

    return descriptions[status as OrderStatus] || '未知状态';
  }

  /**
   * 获取所有允许的下一状态
   */
  getAllowedNextStates(currentStatus: OrderStatus | string): OrderStatus[] {
    const current = currentStatus as OrderStatus;
    return ORDER_STATE_TRANSITIONS[current] || [];
  }
}