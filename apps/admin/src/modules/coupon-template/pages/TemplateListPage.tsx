// apps/admin/src/modules/coupon-template/pages/TemplateListPage.tsx
import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useDeleteMany } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table,
  Button,
  Modal,
  Form,
  Space,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Statistic,
  App,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { TemplateForm } from "../components/TemplateForm";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { createMutationCallbacks, createBatchMutationCallbacks } from "../../../shared/utils/mutationCallbacks";

const { RangePicker } = DatePicker;

interface CouponTemplate {
  id: string;
  title: string;
  buyPrice: number;
  faceValue: number;
  stock: number;
  merchantScope: string[];
  validFrom: Date;
  validUntil: Date;
  description?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    orders: number;
  };
}

export const TemplateListPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CouponTemplate | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();

  // 处理删除单个券模板
  const handleDelete = (id: string) => {
    deleteOne(
      { resource: "couponTemplate", id },
      createMutationCallbacks("删除", query, undefined, message)
    );
  };

  const { result, query } = useList<CouponTemplate>({
    resource: "couponTemplate",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
      ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
    ],
  });

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: CouponTemplate) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      buyPrice: Number(record.buyPrice),
      faceValue: Number(record.faceValue),
      validFrom: dayjs(record.validFrom),
      validUntil: dayjs(record.validUntil),
    });
    setIsModalVisible(true);
  };

  const handleToggleStatus = async (record: CouponTemplate) => {
    const newStatus = record.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? "启用" : "停用";

    update(
      { resource: "couponTemplate", id: record.id, values: { status: newStatus } },
      createMutationCallbacks(actionText, query, undefined, message)
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const action = editingRecord ? "更新" : "创建";

      if (editingRecord) {
        update(
          {
            resource: "couponTemplate",
            id: editingRecord.id,
            values: {
              ...values,
              validFrom: values.validFrom.toISOString(),
              validUntil: values.validUntil.toISOString(),
            },
          },
          createMutationCallbacks(action, query, () => setIsModalVisible(false), message)
        );
      } else {
        create(
          {
            resource: "couponTemplate",
            values: {
              ...values,
              validFrom: values.validFrom.toISOString(),
              validUntil: values.validUntil.toISOString(),
            },
          },
          createMutationCallbacks(action, query, () => setIsModalVisible(false), message)
        );
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的券模板");
      return;
    }

    deleteMany(
      { resource: "couponTemplate", ids: selectedRowKeys },
      createBatchMutationCallbacks("删除", selectedRowKeys.length, query, () =>
        setSelectedRowKeys([])
      , message)
    );
  };

  const getStatusTag = (status: string, validUntil: Date) => {
    const now = new Date();
    const isExpired = new Date(validUntil) < now;

    if (status === 'DISABLED') {
      return <Tag color="default">已停用</Tag>;
    }
    if (isExpired || status === 'EXPIRED') {
      return <Tag color="error">已过期</Tag>;
    }
    return <Tag color="success">上架中</Tag>;
  };

  const columns = [
    {
      title: "券标题",
      dataIndex: "title",
      width: 200,
      render: (title: string) => <span style={{ fontWeight: 500 }}>{title}</span>,
    },
    {
      title: "购买价",
      dataIndex: "buyPrice",
      width: 100,
      render: (price: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{price}</span>
      ),
    },
    {
      title: "面值",
      dataIndex: "faceValue",
      width: 100,
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{value}</span>
      ),
    },
    {
      title: "库存",
      dataIndex: "stock",
      width: 80,
      render: (stock: number) => (
        <Tag color={stock > 10 ? 'success' : stock > 0 ? 'warning' : 'error'}>
          {stock}
        </Tag>
      ),
    },
    {
      title: "适用商户",
      dataIndex: "merchantScope",
      width: 150,
      render: (scope: string[]) => (
        <Tag color="blue">{scope.length} 家商户</Tag>
      ),
    },
    {
      title: "有效期",
      width: 200,
      render: (_: any, record: CouponTemplate) => (
        <span style={{ fontSize: 12 }}>
          {dayjs(record.validFrom).format('YYYY-MM-DD')} ~ {dayjs(record.validUntil).format('YYYY-MM-DD')}
        </span>
      ),
    },
    {
      title: "已售",
      dataIndex: ["_count", "orders"],
      width: 70,
      render: (count: number) => count || 0,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (status: string, record: CouponTemplate) => getStatusTag(status, record.validUntil),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: CouponTemplate) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/coupon-templates/${record.id}`)}
          >
            查看
          </Button>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" type="link" onClick={() => handleToggleStatus(record)}>
            {record.status === 'ACTIVE' ? '停用' : '启用'}
          </Button>
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

  // 统计数据
  const templates = (result as any)?.data || [];
  const activeCount = templates.filter((t: CouponTemplate) => t.status === 'ACTIVE' && new Date(t.validUntil) > new Date()).length;
  const totalStock = templates.reduce((sum: number, t: CouponTemplate) => sum + t.stock, 0);

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>券模板管理</h1>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建券模板
              </Button>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="上架券模板"
                  value={activeCount}
                  prefix={<TagOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总库存"
                  value={totalStock}
                  prefix={<TagOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总销售额"
                  value={templates.reduce((sum: number, t: CouponTemplate) => sum + (t._count?.orders || 0) * t.buyPrice, 0)}
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已售数量"
                  value={templates.reduce((sum: number, t: CouponTemplate) => sum + (t._count?.orders || 0), 0)}
                />
              </Card>
            </Col>
          </Row>

          {/* Search and Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索券标题"
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
              <Select.Option value="ACTIVE">上架中</Select.Option>
              <Select.Option value="DISABLED">已停用</Select.Option>
              <Select.Option value="EXPIRED">已过期</Select.Option>
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
                description={`将删除 ${selectedRowKeys.length} 个券模板`}
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
            dataSource={templates}
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
            title={editingRecord ? "编辑券模板" : "新建券模板"}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={700}
          >
            <TemplateForm form={form} isEdit={!!editingRecord} />
          </Modal>
        </Card>
      </List>
    </div>
  );
};