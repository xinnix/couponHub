// apps/admin/src/shared/utils/export.ts
import dayjs from 'dayjs';
import { toNumber } from './decimal';

interface ExportOrder {
  orderNo: string;
  user?: {
    nickname?: string;
    email: string;
    phone?: string;
  };
  template?: {
    title: string;
  };
  price: number;
  faceValue: number;
  status: string;
  paidAt?: Date;
  redeemedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
}

const statusMap: Record<string, string> = {
  UNPAID: '待支付',
  PAID: '已支付',
  REDEEMED: '已核销',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  EXPIRED: '已过期',
};

export const convertToCSV = (orders: ExportOrder[]) => {
  const headers = [
    '订单号',
    '用户手机',
    '券标题',
    '购买价格',
    '面值',
    '状态',
    '支付时间',
    '核销时间',
    '退款时间',
    '创建时间',
  ];

  const rows = orders.map(order => [
    order.orderNo,
    order.user?.phone || '',
    order.template?.title || '',
    toNumber(order.price).toFixed(2),
    toNumber(order.faceValue).toFixed(2),
    statusMap[order.status] || order.status,
    order.paidAt ? dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss') : '',
    order.redeemedAt ? dayjs(order.redeemedAt).format('YYYY-MM-DD HH:mm:ss') : '',
    order.refundedAt ? dayjs(order.refundedAt).format('YYYY-MM-DD HH:mm:ss') : '',
    dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportOrders = async (orders: ExportOrder[]) => {
  const csv = convertToCSV(orders);
  const filename = `orders_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
  downloadCSV(csv, filename);
};