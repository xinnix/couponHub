// apps/admin/src/modules/order/components/OrderStatusTag.tsx
import { Tag } from 'antd';

export type OrderStatus = 'UNPAID' | 'PAID' | 'REDEEMED' | 'REFUNDING' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';

interface OrderStatusTagProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { color: string; text: string }> = {
  UNPAID: { color: 'default', text: '待支付' },
  PAID: { color: 'success', text: '已支付' },
  REDEEMED: { color: 'processing', text: '已核销' },
  REFUNDING: { color: 'warning', text: '退款中' },
  REFUNDED: { color: 'error', text: '已退款' },
  EXPIRED: { color: 'default', text: '已过期' },
  CANCELLED: { color: 'default', text: '已取消' },
};

export const OrderStatusTag: React.FC<OrderStatusTagProps> = ({ status }) => {
  const config = statusConfig[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};