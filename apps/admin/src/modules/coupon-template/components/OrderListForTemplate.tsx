// apps/admin/src/modules/coupon-template/components/OrderListForTemplate.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  Select,
  Space,
  Tag,
  App,
  Spin,
  Empty,
  Typography,
  Card,
} from "antd";
import {
  UserOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { OrderStatusTag } from "../../order/components/OrderStatusTag";
import type { OrderStatus } from "../../order/components/OrderStatusTag";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";
import { formatCurrency } from "../../../shared/utils/decimal";
import dayjs from "dayjs";

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: OrderStatus;
  price: number;
  faceValue: number;
  isFreeOrder: boolean;
  paidAt?: Date;
  redeemedAt?: Date;
  refundedAt?: Date;
  expireAt?: Date;
  createdAt: Date;
  user?: {
    id: string;
    nickname?: string;
    email: string;
    phone?: string;
  };
  merchant?: {
    id: string;
    name: string;
  };
}

interface OrderListForTemplateProps {
  templateId: string;
  templateTitle: string;
}

export const OrderListForTemplate: React.FC<OrderListForTemplateProps> = ({
  templateId,
  templateTitle,
}) => {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);

  // 获取订单列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders", templateId, page, pageSize, statusFilter],
    queryFn: async () => {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.order.getMany.query({
        page,
        limit: pageSize,
        where: {
          templateId,
          ...(statusFilter && { status: statusFilter }),
        },
        include: {
          user: { select: { id: true, nickname: true, email: true, phone: true } },
          merchant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return result;
    },
    enabled: !!templateId,
  });

  // 获取订单统计（不分页，获取全部订单用于统计）
  const { data: statsData } = useQuery({
    queryKey: ["orderStats", templateId],
    queryFn: async () => {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.order.getMany.query({
        page: 1,
        limit: 9999, // 获取全部订单用于统计
        where: {
          templateId,
        },
        include: {
          user: { select: { id: true } },
          merchant: { select: { id: true } },
        },
      });
      return result?.items || [];
    },
    enabled: !!templateId,
  });

  const orders = data?.items || [];
  const total = data?.total || 0;
  const allOrders = statsData || [];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Empty
        description={
          statusFilter
            ? `该券模板暂无 ${getStatusText(statusFilter)} 的订单`
            : "该券模板暂无订单"
        }
        style={{ padding: '40px 0' }}
      />
    );
  }

  // 统计信息（基于全部订单）
  const unpaidCount = allOrders.filter(o => o.status === 'UNPAID').length;
  const paidCount = allOrders.filter(o => o.status === 'PAID').length;
  const redeemedCount = allOrders.filter(o => o.status === 'REDEEMED').length;
  const refundedCount = allOrders.filter(o => o.status === 'REFUNDED').length;

  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 180,
      fixed: 'left' as 'left',
      render: (orderNo: string) => (
        <Typography.Text
          copyable
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        >
          {orderNo}
        </Typography.Text>
      ),
    },
    {
      title: "用户信息",
      width: 180,
      render: (_: any, record: Order) => (
        <Space direction="vertical" size="small">
          <Space>
            <UserOutlined />
            <Typography.Text strong>
              {record.user?.nickname || '未设置昵称'}
            </Typography.Text>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.user?.email}
          </Typography.Text>
          {record.user?.phone && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              手机: {record.user.phone}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "订单类型",
      dataIndex: "isFreeOrder",
      width: 90,
      render: (isFreeOrder: boolean) => (
        <Tag color={isFreeOrder ? 'cyan' : 'blue'}>
          {isFreeOrder ? '免费领取' : '购买'}
        </Tag>
      ),
    },
    {
      title: "购买价",
      dataIndex: "price",
      width: 100,
      render: (price: any) => (
        <Space>
          <DollarOutlined style={{ color: '#ff4d4f' }} />
          <Typography.Text strong style={{ color: '#ff4d4f' }}>
            {formatCurrency(price)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "面值",
      dataIndex: "faceValue",
      width: 100,
      render: (value: any) => (
        <Space>
          <DollarOutlined style={{ color: '#52c41a' }} />
          <Typography.Text strong style={{ color: '#52c41a' }}>
            {formatCurrency(value)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: OrderStatus) => <OrderStatusTag status={status} />,
    },
    {
      title: "支付时间",
      dataIndex: "paidAt",
      width: 160,
      render: (date: Date) =>
        date ? (
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>
          </Space>
        ) : '-',
    },
    {
      title: "核销商户",
      width: 120,
      render: (_: any, record: Order) =>
        record.merchant?.name ? (
          <Tag color="purple">{record.merchant.name}</Tag>
        ) : '-',
    },
    {
      title: "核销时间",
      dataIndex: "redeemedAt",
      width: 160,
      render: (date: Date) =>
        date ? (
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>
          </Space>
        ) : '-',
    },
    {
      title: "过期时间",
      dataIndex: "expireAt",
      width: 160,
      render: (date: Date) =>
        date ? (
          <Space>
            <ClockCircleOutlined />
            <Typography.Text
              type={new Date(date) < new Date() ? 'danger' : 'secondary'}
            >
              {dayjs(date).format('YYYY-MM-DD HH:mm')}
            </Typography.Text>
          </Space>
        ) : '-',
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 状态统计卡片
  const statisticsCards = (
    <Card style={{ marginBottom: 16 }}>
      <Space size="large" wrap>
        <Space>
          <Tag color="default">待支付: {unpaidCount}</Tag>
        </Space>
        <Space>
          <Tag color="success">待核销: {paidCount}</Tag>
        </Space>
        <Space>
          <Tag color="processing">已核销: {redeemedCount}</Tag>
        </Space>
        <Space>
          <Tag color="error">已退款: {refundedCount}</Tag>
        </Space>
      </Space>
    </Card>
  );

  return (
    <div>
      {statisticsCards}

      {/* 状态筛选 */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选订单状态"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Select.Option value="UNPAID">待支付</Select.Option>
          <Select.Option value="PAID">已支付</Select.Option>
          <Select.Option value="REDEEMED">已核销</Select.Option>
          <Select.Option value="REFUNDING">退款中</Select.Option>
          <Select.Option value="REFUNDED">已退款</Select.Option>
          <Select.Option value="EXPIRED">已过期</Select.Option>
        </Select>
      </Space>

      {/* 订单表格 */}
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1800 }}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条订单`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1);
            }
          },
        }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => {
            // 可以跳转到订单详情页
            window.open(`/orders/${record.id}`, '_blank');
          },
        })}
      />
    </div>
  );
};

// 辅助函数：获取状态文本
function getStatusText(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    UNPAID: '待支付',
    PAID: '已支付',
    REDEEMED: '已核销',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
    EXPIRED: '已过期',
    CANCELLED: '已取消',
  };
  return statusMap[status] || status;
}