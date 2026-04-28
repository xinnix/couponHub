// apps/admin/src/modules/order/pages/OrderListPage.tsx
import React, { useState } from "react";
import { useTable, useUpdate } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table,
  Button,
  Space,
  App,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Tag,
  Statistic,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { OrderStatusTag } from "../components/OrderStatusTag";
import { exportOrders } from "../../../shared/utils/export";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";
import { toNumber, formatCurrency } from "../../../shared/utils/decimal";
import { useTrpcQuery } from "../../../shared/hooks/useTrpcQuery";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  templateId: string;
  status: 'UNPAID' | 'PAID' | 'REDEEMED' | 'REFUNDING' | 'REFUNDED' | 'EXPIRED';
  payId?: string;
  paidAt?: Date;
  redeemMerchantId?: string;
  redeemedAt?: Date;
  refundId?: string;
  refundReason?: string;
  refundedAt?: Date;
  price: number;
  faceValue: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    nickname?: string;
    email: string;
  };
  template?: {
    id: string;
    title: string;
  };
  merchant?: {
    id: string;
    name: string;
  };
}

export const OrderListPage = () => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<Order>({
    resource: "order",
    pagination: {
      currentPage: 1,
      pageSize: 10,
      mode: "server",
    },
    meta: {
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        template: { select: { id: true, title: true } },
        merchant: { select: { id: true, name: true } },
      },
    },
  });

  // 当筛选条件变化时，更新 filters
  const handleFilterChange = () => {
    const filters: any[] = [];

    if (searchText) {
      filters.push({ field: "orderNo", operator: "contains", value: searchText });
    }

    if (statusFilter) {
      filters.push({ field: "status", operator: "eq", value: statusFilter });
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.push({ field: "createdAt", operator: "gte", value: dateRange[0].startOf('day').toISOString() });
      filters.push({ field: "createdAt", operator: "lte", value: dateRange[1].endOf('day').toISOString() });
    }

    // 使用 "replace" 模式确保空数组也会触发请求
    setFilters(filters, "replace");
  };

  // 监听筛选条件变化
  React.useEffect(() => {
    handleFilterChange();
  }, [searchText, statusFilter, dateRange]);

  const result = tableQuery.data;
  const query = tableQuery;
  const orders = (result as any)?.data || [];

  // 统计数据（跟随筛选条件，聚合所有页）
  const { data: stats } = useTrpcQuery<any[]>(
    "order.getStats",
    {
      orderNo: searchText || undefined,
      status: statusFilter || undefined,
      dateFrom: dateRange?.[0]?.startOf('day').toISOString(),
      dateTo: dateRange?.[1]?.endOf('day').toISOString(),
    },
  );
  const unpaidCount = stats?.find((s: any) => s.status === 'UNPAID')?.count || 0;
  const paidCount = stats?.find((s: any) => s.status === 'PAID')?.count || 0;
  const refundingCount = stats?.find((s: any) => s.status === 'REFUNDING')?.count || 0;
  const totalAmount = (stats || [])
    .filter((s: any) => s.status !== 'UNPAID' && s.status !== 'EXPIRED')
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  const totalCount = (stats || []).reduce((sum: number, s: any) => sum + (s.count || 0), 0);
  const redeemedCount = stats?.find((s: any) => s.status === 'REDEEMED')?.count || 0;
  const refundedCount = stats?.find((s: any) => s.status === 'REFUNDED')?.count || 0;
  const refundAmount = (stats || [])
    .filter((s: any) => s.status === 'REFUNDING' || s.status === 'REFUNDED')
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  const handleExport = async () => {
    try {
      const where: any = {};
      if (searchText) where.orderNo = { contains: searchText };
      if (statusFilter) where.status = statusFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        where.createdAt = {
          gte: dateRange[0].startOf('day').toISOString(),
          lte: dateRange[1].endOf('day').toISOString(),
        };
      }

      const trpc = getTrpcClient();
      const result = await (trpc as any).order.getMany.query({
        page: 1,
        limit: 9999,
        where,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
          template: { select: { id: true, title: true } },
          merchant: { select: { id: true, name: true } },
        },
      });

      const allOrders = result?.items || [];
      if (allOrders.length === 0) {
        message.warning('没有可导出的订单');
        return;
      }
      exportOrders(allOrders);
      message.success(`成功导出 ${allOrders.length} 条订单`);
    } catch {
      message.error('导出失败');
    }
  };

  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 180,
      render: (orderNo: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{orderNo}</span>
      ),
    },
    {
      title: "用户",
      width: 120,
      render: (_: any, record: Order) => (
        <span>{record.user?.nickname || record.user?.email || '-'}</span>
      ),
    },
    {
      title: "券标题",
      width: 200,
      render: (_: any, record: Order) => (
        <span style={{ fontWeight: 500 }}>{record.template?.title || '-'}</span>
      ),
    },
    {
      title: "购买价",
      dataIndex: "price",
      width: 90,
      render: (price: any) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatCurrency(price)}</span>
      ),
    },
    {
      title: "面值",
      dataIndex: "faceValue",
      width: 90,
      render: (value: any) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(value)}</span>
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
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: "核销商户",
      width: 120,
      render: (_: any, record: Order) => record.merchant?.name || '-',
    },
    {
      title: "核销时间",
      dataIndex: "redeemedAt",
      width: 160,
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: "锁定",
      dataIndex: "isLocked",
      width: 70,
      render: (isLocked: boolean) => (
        <Tag color={isLocked ? 'warning' : 'default'}>{isLocked ? '是' : '否'}</Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div style={{ maxWidth: 1800, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>订单管理</h1>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                >
                  导出订单
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="订单总数"
                  value={totalCount}
                  prefix={<ShoppingCartOutlined />}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="待核销订单"
                  value={paidCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="已核销订单"
                  value={redeemedCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="已退款订单"
                  value={refundedCount}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="总销售额"
                  value={totalAmount}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="退款总额"
                  value={refundAmount}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Search and Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索订单号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="筛选状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="UNPAID">待支付</Select.Option>
              <Select.Option value="PAID">已支付</Select.Option>
              <Select.Option value="REDEEMED">已核销</Select.Option>
              <Select.Option value="REFUNDING">退款中</Select.Option>
              <Select.Option value="REFUNDED">已退款</Select.Option>
              <Select.Option value="EXPIRED">已过期</Select.Option>
            </Select>
            <RangePicker
              placeholder={['创建开始日期', '创建结束日期']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: 280 }}
            />
          </Space>

          {/* Batch Actions */}
          {selectedRowKeys.length > 0 && (
            <Space style={{ marginBottom: 16 }}>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                取消选择
              </Button>
            </Space>
          )}

          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys as string[]),
            }}
            columns={columns}
            rowKey="id"
            dataSource={orders}
            loading={query.isLoading}
            scroll={{ x: 2000 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              },
            }}
          />
        </Card>
      </List>
    </div>
  );
};