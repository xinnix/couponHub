// apps/admin/src/pages/list.tsx
import { useList, useCreate, useUpdate } from "@refinedev/core";
import { List, DeleteButton } from "@refinedev/antd";
import { Table, Button, Modal, Form, Input, Select, Space, message, Tag } from "antd";
import { useState } from "react";

export const TodoListPage = () => {
  // Use useList instead of useTable
  const { result, query } = useList({
    resource: "todo",
    pagination: {
      pageSize: 10,
    },
    queryOptions: {
      enabled: true, // Explicitly enable the query
    },
  });

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const columns = [
    { title: "ID", dataIndex: "id", width: 200 },
    { title: "标题", dataIndex: "title" },
    {
      title: "描述",
      dataIndex: "description",
      render: (val: string) => val || "-",
    },
    {
      title: "优先级",
      dataIndex: "priority",
      render: (val: number) => {
        const colors = { 1: "blue", 2: "orange", 3: "red" };
        const labels = { 1: "低", 2: "中", 3: "高" };
        return (
          <Tag color={colors[val as keyof typeof colors]}>
            {labels[val as keyof typeof labels]}
          </Tag>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "isCompleted",
      render: (isCompleted: boolean, record: any) => (
        <Button size="small" type="link" onClick={() => handleToggleStatus(record)}>
          {isCompleted ? "✅ 已完成" : "⏳ 待办"}
        </Button>
      ),
    },
    {
      title: "操作",
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            编辑
          </Button>
          <DeleteButton
            hideText
            recordItemId={record.id}
            resource="todo"
            onSuccess={() => {
              message.success("删除成功");
              query.refetch();
            }}
          />
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleToggleStatus = (record: any) => {
    update(
      {
        resource: "todo",
        id: record.id,
        values: { isCompleted: !record.isCompleted },
      },
      {
        onSuccess: () => {
          message.success("状态更新成功");
          query.refetch();
        },
        onError: () => {
          message.error("状态更新失败");
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
            resource: "todo",
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
              console.error("Update error:", error);
              message.error("更新失败");
            },
          }
        );
      } else {
        create(
          {
            resource: "todo",
            values: values,
          },
          {
            onSuccess: () => {
              message.success("创建成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: (error: any) => {
              console.error("Create error:", error);
              message.error("创建失败");
            },
          }
        );
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <List>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>我的待办事项</h1>
          <Button type="primary" onClick={handleCreate}>
            + 新建待办
          </Button>
        </div>
        <Table
          columns={columns}
          rowKey="id"
          dataSource={result?.data || []}
          loading={query.isLoading}
          pagination={{
            current: 1,
            pageSize: 10,
            total: result?.total || 0,
            showSizeChanger: true,
          }}
        />

        <Modal
        title={editingRecord ? "编辑待办" : "新建待办"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            initialValue={1}
          >
            <Select placeholder="请选择优先级">
              <Select.Option value={1}>低</Select.Option>
              <Select.Option value={2}>中</Select.Option>
              <Select.Option value={3}>高</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      </List>
    </div>
  );
};
