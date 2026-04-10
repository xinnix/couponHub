// apps/admin/src/modules/settlement/pages/SettlementListPage.tsx
import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useDeleteMany } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "../../../shared/dataProvider/dataProvider";
import { List } from "@refinedev/antd";
import {
  Table,
  Button,
  Modal,
  Form,
  Space,
  App,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PayCircleOutlined,
} from "@ant-design/icons";
import { SettlementForm } from "../components/SettlementForm";
import { useNavigate } from "react-router-dom";
import { formatCurrency, toNumber } from "../../../shared/utils/decimal";
import dayjs from "dayjs";

const { MonthPicker } = DatePicker;

interface Settlement {
  id: string;
  merchantId: string;
  period: string;
  totalAmount: number;
  orderCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PAID';
  snapshotData: any;
  confirmedAt?: Date;
  confirmedBy?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  merchant?: {
    id: string;
    name: string;
    phone?: string;
    category?: {
      name: string;
    };
  };
}

export const SettlementListPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [merchantFilter, setMerchantFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { mutate: create } = useCreate();
  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();
  const { mutate: updateOne } = useUpdate();

  // 处理删除单个结算记录
  const handleDelete = (id: string) => {
    deleteOne(
      { resource: "settlement", id },
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

  // 确认结算
  const handleConfirm = (record: Settlement) => {
    updateOne(
      {
        resource: "settlement",
        id: record.id,
        values: { settlementId: record.id },
        meta: { method: 'confirm' },
      },
      {
        onSuccess: () => {
          message.success("确认成功");
          query.refetch();
        },
        onError: () => {
          message.error("确认失败");
        },
      }
    );
  };

  // 标记已支付
  const handleMarkPaid = (record: Settlement) => {
    updateOne(
      {
        resource: "settlement",
        id: record.id,
        values: { settlementId: record.id },
        meta: { method: 'markPaid' },
      },
      {
        onSuccess: () => {
          message.success("已标记为已支付");
          query.refetch();
        },
        onError: () => {
          message.error("操作失败");
        },
      }
    );
  };

  const { result, query } = useList<Settlement>({
    resource: "settlement",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
      ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
      ...(merchantFilter ? [{ field: "merchantId", operator: "eq", value: merchantFilter }] as any : []),
    ],
  });

  const settlements = (result as any)?.data || [];

  // 获取商户列表用于筛选
  const { result: merchantsResult } = useList({
    resource: "merchant",
    pagination: { pageSize: 100 },
  });

  const merchants = (merchantsResult as any)?.data || [];

  // 从后端获取全量统计数据（不受分页影响）
  const { data: stats } = useQuery({
    queryKey: ['settlement', 'stats'],
    queryFn: () => (trpcClient as any).settlement.getStats.query(),
  });
  const settlementStats = stats ?? {
    pendingCount: 0,
    confirmedCount: 0,
    totalPaidAmount: 0,
    totalCount: 0,
  };

  const handleCreate = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 格式化期间为 YYYY-MM
      const period = values.period ? dayjs(values.period).format('YYYY-MM') : '';

      create(
        {
          resource: "settlement",
          values: {
            merchantId: values.merchantId,
            period,
          },
          meta: {
            method: 'createSettlement',
          },
        },
        {
          onSuccess: () => {
            message.success("结算单生成成功");
            setIsModalVisible(false);
            query.refetch();
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || "生成失败");
          },
        }
      );
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的结算单");
      return;
    }

    deleteMany(
      {
        resource: "settlement",
        ids: selectedRowKeys,
      },
      {
        onSuccess: () => {
          message.success(`成功删除 ${selectedRowKeys.length} 个结算单`);
          setSelectedRowKeys([]);
          query.refetch();
        },
        onError: () => {
          message.error("批量删除失败");
        },
      }
    );
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: '待确认' },
      CONFIRMED: { color: 'processing', text: '已确认' },
      PAID: { color: 'success', text: '已支付' },
    };
    const { color, text } = config[status];
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: "结算期间",
      dataIndex: "period",
      width: 120,
      render: (period: string) => (
        <span style={{ fontWeight: 500 }}>{period}</span>
      ),
    },
    {
      title: "商户名称",
      width: 200,
      render: (_: any, record: Settlement) => (
        <span>{record.merchant?.name || '-'}</span>
      ),
    },
    {
      title: "商户分类",
      width: 100,
      render: (_: any, record: Settlement) => (
        <Tag color="blue">{record.merchant?.category?.name || '-'}</Tag>
      ),
    },
    {
      title: "订单数量",
      dataIndex: "orderCount",
      width: 100,
      render: (count: number) => <span>{count || 0}</span>,
    },
    {
      title: "结算金额",
      dataIndex: "totalAmount",
      width: 130,
      render: (amount: any) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "确认时间",
      dataIndex: "confirmedAt",
      width: 160,
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: "支付时间",
      dataIndex: "paidAt",
      width: 160,
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: "操作",
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Settlement) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/settlements/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'PENDING' && (
            <Popconfirm
              title="确认结算？"
              description="确认后将进入已确认状态"
              onConfirm={() => handleConfirm(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link" icon={<CheckCircleOutlined />}>
                确认
              </Button>
            </Popconfirm>
          )}
          {record.status === 'CONFIRMED' && (
            <Popconfirm
              title="标记为已支付？"
              description="确认该结算单已完成支付"
              onConfirm={() => handleMarkPaid(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link" icon={<PayCircleOutlined />} style={{ color: '#52c41a' }}>
                已支付
              </Button>
            </Popconfirm>
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
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>结算管理</h1>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                生成结算单
              </Button>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待确认结算单"
                  value={settlementStats.pendingCount}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已确认结算单"
                  value={settlementStats.confirmedCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已支付总额"
                  value={settlementStats.totalPaidAmount}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总结算单数"
                  value={settlementStats.totalCount}
                />
              </Card>
            </Col>
          </Row>

          {/* Search and Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索商户名称"
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
              <Select.Option value="PENDING">待确认</Select.Option>
              <Select.Option value="CONFIRMED">已确认</Select.Option>
              <Select.Option value="PAID">已支付</Select.Option>
            </Select>
            <Select
              placeholder="筛选商户"
              value={merchantFilter}
              onChange={setMerchantFilter}
              style={{ width: 200 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {merchants.map((m: any) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>
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
                description={`将删除 ${selectedRowKeys.length} 个结算单`}
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
            dataSource={settlements}
            loading={query.isLoading}
            scroll={{ x: 1500 }}
            pagination={{
              current: 1,
              pageSize: 10,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <Modal
            title="生成结算单"
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={600}
          >
            <SettlementForm form={form} merchants={merchants} />
          </Modal>
        </Card>
      </List>
    </div>
  );
};