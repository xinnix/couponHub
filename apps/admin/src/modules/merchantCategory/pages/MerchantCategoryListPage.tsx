// apps/admin/src/modules/merchantCategory/pages/MerchantCategoryListPage.tsx
import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, Card, App
} from "antd";
import { PlusOutlined } from '@ant-design/icons';
import { PermissionGuard } from "../../../shared/components/PermissionGuard";

interface MerchantCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  _count?: {
    merchants: number;
  };
  createdAt: Date;
}

export const MerchantCategoryListPage = () => {
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MerchantCategory | null>(null);
  const [form] = Form.useForm();

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteOne } = useDelete();

  const { result, query } = useList<MerchantCategory>({
    resource: "merchantCategory",
    pagination: { pageSize: 20 },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRecord) {
        update(
          { resource: "merchantCategory", id: editingRecord.id, values },
          {
            onSuccess: () => {
              message.success("更新成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: () => message.error("更新失败"),
          }
        );
      } else {
        create(
          { resource: "merchantCategory", values },
          {
            onSuccess: () => {
              message.success("创建成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: () => message.error("创建失败"),
          }
        );
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const columns = [
    { title: "类别名称", dataIndex: "name", width: 150 },
    { title: "标识符", dataIndex: "slug", width: 150 },
    { title: "描述", dataIndex: "description", width: 200 },
    { title: "排序", dataIndex: "sortOrder", width: 80 },
    {
      title: "商户数量",
      dataIndex: ["_count", "merchants"],
      width: 100,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: "操作",
      width: 150,
      render: (_: any, record: MerchantCategory) => (
        <Space size="small">
          <PermissionGuard resource="merchantCategory" action="update">
            <Button type="link" onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard resource="merchantCategory" action="delete">
            <Popconfirm
              title="确认删除？"
              onConfirm={() => deleteOne(
                { resource: "merchantCategory", id: record.id },
                {
                  onSuccess: () => {
                    message.success("删除成功");
                    query.refetch();
                  },
                  onError: () => message.error("删除失败"),
                }
              )}
            >
              <Button type="link" danger>删除</Button>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const categories = result?.data || [];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0 }}>商户类别管理</h1>
            <PermissionGuard resource="merchantCategory" action="create">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRecord(null);
                  form.resetFields();
                  setIsModalVisible(true);
                }}
              >
                新建类别
              </Button>
            </PermissionGuard>
          </div>

          <Table
            columns={columns}
            rowKey="id"
            dataSource={categories}
            loading={query.isLoading}
            pagination={{
              pageSize: 20,
              total: result?.total || 0,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <Modal
            title={editingRecord ? "编辑类别" : "新建类别"}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={600}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="类别名称"
                rules={[{ required: true, message: "请输入类别名称" }]}
              >
                <Input placeholder="如：餐饮、服装、娱乐" maxLength={50} />
              </Form.Item>

              <Form.Item
                name="slug"
                label="标识符"
                rules={[
                  { required: true, message: "请输入标识符" },
                  { pattern: /^[a-z0-9-]+$/, message: "只能包含小写字母、数字和连字符" }
                ]}
              >
                <Input placeholder="如：restaurant、clothing" maxLength={50} />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea rows={3} placeholder="类别描述" maxLength={200} />
              </Form.Item>

              <Form.Item name="icon" label="图标 URL">
                <Input placeholder="图标 URL" />
              </Form.Item>

              <Form.Item name="sortOrder" label="排序权重" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="status" label="状态" initialValue="ACTIVE">
                <Select>
                  <Select.Option value="ACTIVE">启用</Select.Option>
                  <Select.Option value="INACTIVE">禁用</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </List>
    </div>
  );
};