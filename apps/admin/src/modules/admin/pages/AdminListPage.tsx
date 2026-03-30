import { useState } from "react";
import { useList, useCreate, useUpdate, useDeleteMany } from "@refinedev/core";
import { List, DeleteButton } from "@refinedev/antd";
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
  Avatar,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  UserOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { AdminForm } from "../components/AdminForm";
import { useNavigate } from "react-router-dom";
import { trpcClient } from "../../../shared/dataProvider/dataProvider";

interface AdminRole {
  id: string;
  name: string;
  slug: string;
  level: number;
}

interface AdminRecord {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles: AdminRole[];
}

export const AdminListPage = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [passwordRecord, setPasswordRecord] = useState<AdminRecord | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { message } = App.useApp();

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteMany } = useDeleteMany();

  const { result, query } = useList<AdminRecord>({
    resource: "admin",
    pagination: { pageSize: 10 },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains" as const, value: searchText }] : []),
      ...(statusFilter !== undefined ? [{ field: "isActive", operator: "eq" as const, value: statusFilter }] : []),
    ],
  });

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: AdminRecord) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleToggleActive = async (record: AdminRecord) => {
    try {
      await (trpcClient as any).admin.toggleActive.mutate({ id: record.id });
      message.success(record.isActive ? "已停用" : "已启用");
      query.refetch();
    } catch (error: any) {
      message.error(error.message || "操作失败");
    }
  };

  const handleResetPassword = (record: AdminRecord) => {
    setPasswordRecord(record);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      await (trpcClient as any).admin.resetPassword.mutate({
        adminId: passwordRecord!.id,
        newPassword: values.newPassword,
      });
      message.success("密码重置成功");
      setIsPasswordModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || "重置失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRecord) {
        update(
          { resource: "admin", id: editingRecord.id, values },
          {
            onSuccess: () => {
              message.success("更新成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: (error: any) => {
              message.error(error.message || "更新失败");
            },
          }
        );
      } else {
        create(
          { resource: "admin", values },
          {
            onSuccess: () => {
              message.success("创建成功");
              setIsModalVisible(false);
              query.refetch();
            },
            onError: (error: any) => {
              message.error(error.message || "创建失败");
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
      message.warning("请选择要删除的管理员");
      return;
    }
    deleteMany(
      { resource: "admin", ids: selectedRowKeys },
      {
        onSuccess: () => {
          message.success(`成功删除 ${selectedRowKeys.length} 个管理员`);
          setSelectedRowKeys([]);
          query.refetch();
        },
        onError: (error: any) => {
          message.error(error.message || "批量删除失败");
        },
      }
    );
  };

  const columns = [
    {
      title: "管理员",
      dataIndex: "username",
      width: 200,
      render: (username: string, record: AdminRecord) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} src={record.avatar} />
          <span style={{ fontWeight: 500 }}>{username}</span>
        </Space>
      ),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 200,
    },
    {
      title: "姓名",
      width: 120,
      render: (_: any, record: AdminRecord) => {
        const name = [record.lastName, record.firstName].filter(Boolean).join("");
        return name || "-";
      },
    },
    {
      title: "角色",
      dataIndex: "roles",
      width: 200,
      render: (roles: AdminRole[]) =>
        roles.length > 0
          ? roles.map((role) => (
              <Tag key={role.id} color={role.level <= 5 ? "red" : role.level <= 10 ? "blue" : "default"}>
                {role.name}
              </Tag>
            ))
          : <Tag>无角色</Tag>,
    },
    {
      title: "状态",
      dataIndex: "isActive",
      width: 90,
      render: (isActive: boolean, record: AdminRecord) => (
        <Button
          size="small"
          type="text"
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
          style={{ color: isActive ? "#52c41a" : "#ff4d4f" }}
          onClick={() => handleToggleActive(record)}
        >
          {isActive ? "启用" : "停用"}
        </Button>
      ),
    },
    {
      title: "最后登录",
      dataIndex: "lastLoginAt",
      width: 160,
      render: (date: string) => (date ? new Date(date).toLocaleString("zh-CN") : "-"),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: string) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      width: 240,
      fixed: "right" as const,
      render: (_: any, record: AdminRecord) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => navigate(`/admins/${record.id}`)}>
            查看
          </Button>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" type="link" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>
            重置密码
          </Button>
          <DeleteButton
            hideText
            recordItemId={record.id}
            resource="admin"
            onSuccess={() => {
              message.success("删除成功");
              query.refetch();
            }}
          />
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
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>管理员管理</h1>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建管理员
              </Button>
            </Col>
          </Row>

          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索用户名、邮箱或姓名"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
            <Select
              placeholder="筛选状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>停用</Select.Option>
            </Select>
          </Space>

          {selectedRowKeys.length > 0 && (
            <Space style={{ marginBottom: 16 }}>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                取消选择
              </Button>
              <Popconfirm
                title="确认批量删除？"
                description={`将删除 ${selectedRowKeys.length} 个管理员`}
                onConfirm={handleBatchDelete}
              >
                <Button size="small" danger>批量删除</Button>
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
            title={editingRecord ? "编辑管理员" : "新建管理员"}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={600}
          >
            <AdminForm form={form} isEdit={!!editingRecord} />
          </Modal>

          <Modal
            title={`重置密码 - ${passwordRecord?.username || ""}`}
            open={isPasswordModalVisible}
            onOk={handlePasswordSubmit}
            onCancel={() => setIsPasswordModalVisible(false)}
            okText="确认重置"
            cancelText="取消"
          >
            <Form form={passwordForm} layout="vertical">
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: "请输入新密码" },
                  { min: 8, message: "密码至少 8 个字符" },
                ]}
              >
                <Input.Password placeholder="请输入新密码（至少 8 个字符）" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "请确认密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次输入的密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入新密码" />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </List>
    </div>
  );
};
