// apps/admin/src/modules/order/pages/OrderListPage.tsx
import { useState } from "react";
import { useList, useUpdate, useDelete, useDeleteMany } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table,
  Button,
  Space,
  App,
  Popconfirm,
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
import { RefundModal } from "../components/RefundModal";
import { BatchRefundModal } from "../components/BatchRefundModal";
import { useNavigate } from "react-router-dom";
import { exportOrders } from "../../../shared/utils/export";
import { toNumber, formatCurrency } from "../../../shared/utils/decimal";
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
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [batchRefundModalVisible, setBatchRefundModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();

  // 处理删除单个订单
  const handleDelete = (id: string) => {
    deleteOne(
      { resource: "order", id },
      {
        onSuccess: () => {
          message.success("删除成功");
          query.refetch();
        },
        onError: () => {
          message.error("删除失败");
        },
      }
    );
  };

  const { result, query } = useList<Order>({
    resource: "order",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "orderNo", operator: "contains", value: searchText }] as any : []),
      ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
      ...(dateRange && dateRange[0] && dateRange[1] ? [
        { field: "createdAt", operator: "gte", value: dateRange[0].startOf('day').toISOString() },
        { field: "createdAt", operator: "lte", value: dateRange[1].endOf('day').toISOString() },
      ] as any : []),
    ],
  });

  const orders = (result as any)?.data || [];

  // 统计数据
  const unpaidCount = orders.filter((o: Order) => o.status === 'UNPAID').length;
  const paidCount = orders.filter((o: Order) => o.status === 'PAID').length;
  const refundingCount = orders.filter((o: Order) => o.status === 'REFUNDING').length;
  const totalAmount = orders
    .filter((o: Order) => o.status !== 'UNPAID' && o.status !== 'EXPIRED')
    .reduce((sum: number, o: Order) => sum + o.price, 0);

  const handleExport = () => {
    if (orders.length === 0) {
      message.warning('没有可导出的订单');
      return;
    }
    exportOrders(orders);
    message.success('导出成功');
  };

  const handleRefund = (record: Order) => {
    setSelectedOrder(record);
    setRefundModalVisible(true);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的订单");
      return;
    }

    deleteMany(
      {
        resource: "order",
        ids: selectedRowKeys,
      },
      {
        onSuccess: () => {
          message.success(`成功删除 ${selectedRowKeys.length} 个订单`);
          setSelectedRowKeys([]);
          query.refetch();
        },
        onError: () => {
          message.error("批量删除失败");
        },
      }
    );
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
    {
      title: "操作",
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Order) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'REFUNDING' && (
            <Button
              size="small"
              type="link"
              danger
              onClick={() => handleRefund(record)}
            >
              退款审核
            </Button>
          )}
          <Popconfirm
            title="确认删除？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
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
                <Button
                  type="primary"
                  danger
                  onClick={() => setBatchRefundModalVisible(true)}
                >
                  批量退款
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待支付订单"
                  value={unpaidCount}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待核销订单"
                  value={paidCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="退款中订单"
                  value={refundingCount}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
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
              <Popconfirm
                title="确认批量删除？"
                description={`将删除 ${selectedRowKeys.length} 个订单`}
                onConfirm={handleBatchDelete}
              >
                <Button size="small" danger>
                  批量删除
                </Button>
              </Popconfirm>
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
              current: 1,
              pageSize: 10,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <RefundModal
            visible={refundModalVisible}
            order={selectedOrder}
            onCancel={() => {
              setRefundModalVisible(false);
              setSelectedOrder(null);
            }}
            onSuccess={() => {
              setRefundModalVisible(false);
              setSelectedOrder(null);
              query.refetch();
            }}
          />

          <BatchRefundModal
            visible={batchRefundModalVisible}
            onCancel={() => setBatchRefundModalVisible(false)}
            onSuccess={() => {
              setBatchRefundModalVisible(false);
              query.refetch();
            }}
          />
        </Card>
      </List>
    </div>
  );
};