// apps/admin/src/modules/coupon-template/pages/TemplateListPage.tsx
import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useDeleteMany, useCustom } from "@refinedev/core";
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
  Image,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  QrcodeOutlined,
  DollarOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { TemplateForm } from "../components/TemplateForm";
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
  usageRules?: string; // 使用规则说明
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  qrcodeUrl?: string; // 小程序码 URL
  qrcodeGeneratedAt?: Date; // 小程序码生成时间
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    orders: number;
  };
}

export const TemplateListPage = () => {
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CouponTemplate | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  // 小程序码相关 state
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState(false);
  const [currentQrcode, setCurrentQrcode] = useState<{
    id: string;
    url?: string;
    title: string;
    qrcodeGeneratedAt?: Date;
  } | null>(null);
  const [generatingQrcode, setGeneratingQrcode] = useState(false);

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();
  const { mutate: generateQrcode } = useCustom();

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
      ...(searchText ? [{ field: "title", operator: "contains", value: searchText }] as any : []),
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

  const handleShowQrcode = (record: CouponTemplate) => {
    setCurrentQrcode({
      id: record.id,
      url: record.qrcodeUrl,
      title: record.title,
      qrcodeGeneratedAt: record.qrcodeGeneratedAt,
    });
    setQrcodeModalVisible(true);
  };

  const handleGenerateQrcode = async () => {
    if (!currentQrcode) return;

    setGeneratingQrcode(true);
    generateQrcode(
      {
        method: 'mutation',
        resource: 'couponTemplate',
        id: currentQrcode.id,
        meta: { operation: 'generateQrcode' },
      },
      {
        onSuccess: (data) => {
          setCurrentQrcode({
            ...currentQrcode,
            url: data.data.url,
            qrcodeGeneratedAt: new Date(),
          });
          message.success('小程序码生成成功');
          query.refetch();
        },
        onError: (error) => {
          message.error('生成失败: ' + error.message);
        },
        onSettled: () => {
          setGeneratingQrcode(false);
        },
      }
    );
  };

  const getStatusTag = (record: CouponTemplate) => {
    const { status, validUntil } = record;
    const isExpired = new Date(validUntil) < new Date();

    if (status === 'DISABLED') {
      return <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => handleToggleStatus(record)}>已停用</Tag>;
    }
    if (isExpired || status === 'EXPIRED') {
      return <Tag color="error">已过期</Tag>;
    }
    return <Tag color="success" style={{ cursor: 'pointer' }} onClick={() => handleToggleStatus(record)}>上架中</Tag>;
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
      render: (status: string, record: CouponTemplate) => getStatusTag(record),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: CouponTemplate) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<QrcodeOutlined />}
            onClick={() => handleShowQrcode(record)}
          >
            小程序码
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

          {/* 小程序码 Modal */}
          <Modal
            title="小程序码管理"
            open={qrcodeModalVisible}
            onCancel={() => setQrcodeModalVisible(false)}
            footer={[
              <Button key="close" onClick={() => setQrcodeModalVisible(false)}>
                关闭
              </Button>,
              !currentQrcode?.url && (
                <Button
                  key="generate"
                  type="primary"
                  loading={generatingQrcode}
                  onClick={handleGenerateQrcode}
                >
                  生成小程序码
                </Button>
              ),
              currentQrcode?.url && (
                <Button key="regenerate" loading={generatingQrcode} onClick={handleGenerateQrcode}>
                  重新生成
                </Button>
              ),
              currentQrcode?.url && (
                <Button
                  key="download"
                  type="primary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = currentQrcode.url!;
                    link.download = `qrcode-${currentQrcode.id}.png`;
                    link.click();
                  }}
                >
                  下载
                </Button>
              ),
            ]}
            width={500}
          >
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: 16 }}>{currentQrcode?.title}</h3>

              {currentQrcode?.url ? (
                <div>
                  <Image src={currentQrcode.url} width={280} height={280} alt="小程序码" />
                  <p style={{ marginTop: 12, color: '#666' }}>扫码直接进入券购买页面</p>
                  {currentQrcode.qrcodeGeneratedAt && (
                    <p style={{ fontSize: 12, color: '#999' }}>
                      生成时间: {new Date(currentQrcode.qrcodeGeneratedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ padding: '80px 0', color: '#999' }}>
                  <QrcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <p>暂无小程序码</p>
                  <p>点击"生成小程序码"按钮创建</p>
                </div>
              )}
            </div>
          </Modal>
        </Card>
      </List>
    </div>
  );
};