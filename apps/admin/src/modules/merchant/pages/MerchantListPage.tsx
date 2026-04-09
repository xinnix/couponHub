// apps/admin/src/modules/merchant/pages/MerchantListPage.tsx
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
  App,
} from "antd";
import { PlusOutlined, SearchOutlined, CheckCircleOutlined, StopOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { MerchantForm } from "../components/MerchantForm";
import { HandlerList } from "../components/HandlerList";
import { useNavigate } from "react-router-dom";

interface MerchantCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  status: string;
}

interface Merchant {
  id: string;
  name: string;
  logo?: string;
  categoryId: string;
  category?: MerchantCategory;
  area?: string;
  floor?: string;
  phone?: string;
  gallery?: string[];
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    handlers: number;
    orders: number;
  };
}

export const MerchantListPage = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Merchant | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [areaFilter, setAreaFilter] = useState<string | undefined>(undefined);
  const [handlerModalVisible, setHandlerModalVisible] = useState(false);
  const [handlerMerchant, setHandlerMerchant] = useState<Merchant | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();

  // 处理删除单个商户
  const handleDelete = (id: string) => {
    deleteOne(
      { resource: "merchant", id },
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

  // 获取商户分类列表用于筛选
  const { result: categoriesResult } = useList<MerchantCategory>({
    resource: "merchantCategory",
    pagination: { pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
  });

  const categories = categoriesResult?.data || [];

  const { result, query } = useList<Merchant>({
    resource: "merchant",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
      ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
      ...(categoryFilter ? [{ field: "categoryId", operator: "eq", value: categoryFilter }] as any : []),
      ...(areaFilter ? [{ field: "area", operator: "eq", value: areaFilter }] as any : []),
    ],
    meta: {
      include: {
        category: true,
        _count: {
          select: {
            handlers: true,
            orders: true,
          },
        },
      },
    },
  });

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Merchant) => {
    setEditingRecord(record);
    // 需要设置 categoryId 而不是 category 对象
    form.setFieldsValue({
      ...record,
      categoryId: record.categoryId,
    });
    setIsModalVisible(true);
  };

  const handleToggleStatus = async (record: Merchant) => {
    update(
      {
        resource: "merchant",
        id: record.id,
        values: { status: record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      },
      {
        onSuccess: () => {
          message.success(record.status === 'ACTIVE' ? "商户已停用" : "商户已激活");
          query.refetch();
        },
        onError: () => {
          message.error("操作失败");
        },
      }
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRecord) {
        update(
          {
            resource: "merchant",
            id: editingRecord.id,
            values: values,
          },
          {
            onSuccess: () => {
              message.success("更新成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: (error: any) => {
              message.error("更新失败");
            },
          }
        );
      } else {
        create(
          {
            resource: "merchant",
            values: values,
          },
          {
            onSuccess: () => {
              message.success("创建成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: (error: any) => {
              message.error("创建失败");
            },
          }
        );
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的商户");
      return;
    }

    deleteMany(
      {
        resource: "merchant",
        ids: selectedRowKeys,
      },
      {
        onSuccess: () => {
          message.success(`成功删除 ${selectedRowKeys.length} 个商户`);
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
      title: "商户名称",
      dataIndex: "name",
      width: 200,
      render: (name: string, record: Merchant) => (
        <Space>
          {record.logo && (
            <img src={record.logo} alt={name} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
          )}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: "分类",
      dataIndex: "category",
      width: 100,
      render: (category: MerchantCategory) => {
        if (!category) return '-';
        const colorMap: Record<string, string> = {
          '餐饮': 'orange',
          '服装': 'blue',
          '娱乐': 'purple',
          '美容': 'pink',
          '其他': 'default',
        };
        return <Tag color={colorMap[category.name] || 'default'}>{category.name}</Tag>;
      },
    },
    {
      title: "区域",
      dataIndex: "area",
      width: 80,
      render: (area: string) => area ? <Tag color="geekblue">{area}</Tag> : '-',
    },
    {
      title: "楼层",
      dataIndex: "floor",
      width: 80,
      render: (floor: string) => floor || '-',
    },
    {
      title: "电话",
      dataIndex: "phone",
      width: 130,
      render: (phone: string) => phone || '-',
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (status: string, record: Merchant) => (
        <Button
          size="small"
          type="text"
          icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <StopOutlined />}
          style={{ color: status === 'ACTIVE' ? "#52c41a" : "#ff4d4f" }}
          onClick={() => handleToggleStatus(record)}
        >
          {status === 'ACTIVE' ? "激活" : "停用"}
        </Button>
      ),
    },
    {
      title: "核销员数",
      dataIndex: ["_count", "handlers"],
      width: 90,
      render: (count: number) => count || 0,
    },
    {
      title: "核销订单",
      dataIndex: ["_count", "orders"],
      width: 90,
      render: (count: number) => count || 0,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Merchant) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<UserSwitchOutlined />}
            onClick={() => {
              setHandlerMerchant(record);
              setHandlerModalVisible(true);
            }}
          >
            核销员
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

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>商户管理</h1>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建商户
              </Button>
            </Col>
          </Row>

          {/* Search and Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索商户名称或电话"
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
              <Select.Option value="ACTIVE">激活</Select.Option>
              <Select.Option value="INACTIVE">停用</Select.Option>
            </Select>
            <Select
              placeholder="筛选分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 120 }}
              allowClear
            >
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="筛选区域"
              value={areaFilter}
              onChange={setAreaFilter}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="A区">A区</Select.Option>
              <Select.Option value="B区">B区</Select.Option>
              <Select.Option value="C区">C区</Select.Option>
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
                description={`将删除 ${selectedRowKeys.length} 个商户`}
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
            dataSource={(result as any)?.data || []}
            loading={query.isLoading}
            scroll={{ x: 1400 }}
            pagination={{
              current: 1,
              pageSize: 10,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <Modal
            title={editingRecord ? "编辑商户" : "新建商户"}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={700}
          >
            <MerchantForm form={form} isEdit={!!editingRecord} />
          </Modal>

          <Modal
            title={`核销员管理 - ${handlerMerchant?.name || ''}`}
            open={handlerModalVisible}
            onCancel={() => {
              setHandlerModalVisible(false);
              setHandlerMerchant(null);
              query.refetch();
            }}
            footer={null}
            width={800}
          >
            {handlerMerchant && <HandlerList merchantId={handlerMerchant.id} />}
          </Modal>
        </Card>
      </List>
    </div>
  );
};