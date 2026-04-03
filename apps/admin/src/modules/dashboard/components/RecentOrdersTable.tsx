import { useTrpcQuery } from '../../../shared/hooks/useTrpcQuery';
import { Card, Table, Tag, Spin } from 'antd';
import { formatCurrency } from '../../../shared/utils/decimal';
import dayjs from 'dayjs';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: '待支付', color: 'default' },
  PAID: { label: '已支付', color: 'blue' },
  REDEEMED: { label: '已核销', color: 'green' },
  REFUNDING: { label: '退款中', color: 'orange' },
  REFUNDED: { label: '已退款', color: 'red' },
  EXPIRED: { label: '已过期', color: 'default' },
};

export function RecentOrdersTable() {
  const { data, isLoading } = useTrpcQuery('statistics.getRecentOrders', { limit: 10 });

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      ellipsis: true,
    },
    {
      title: '用户手机',
      key: 'user',
      width: 130,
      render: (_: any, record: any) => record.user?.phone || '-',
    },
    {
      title: '券标题',
      key: 'template',
      width: 150,
      ellipsis: true,
      render: (_: any, record: any) => record.template?.title || '-',
    },
    {
      title: '金额',
      key: 'price',
      width: 100,
      render: (_: any, record: any) => formatCurrency(Number(record.price)),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const s = STATUS_MAP[status];
        return s ? <Tag color={s.color}>{s.label}</Tag> : status;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Card title="最近订单" className="chart-card">
      <Table
        dataSource={data ?? []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 800 }}
      />
    </Card>
  );
}
