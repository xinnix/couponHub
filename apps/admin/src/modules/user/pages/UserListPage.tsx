// apps/admin/src/modules/user/pages/UserListPage.tsx
import { useState } from "react";
import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Row,
  Col,
} from "antd";
import { SearchOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export const UserListPage = () => {
  const [searchText, setSearchText] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  const { result, query } = useList<User>({
    resource: "user",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
      ...(isActiveFilter !== undefined ? [{ field: "isActive", operator: "eq", value: isActiveFilter }] as any : []),
    ],
  });

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      render: (id: string) => <span style={{ fontSize: 12, color: "#999" }}>{id.slice(0, 8)}...</span>,
    },
    {
      title: "用户名",
      dataIndex: "username",
      width: 120,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 180,
    },
    {
      title: "姓名",
      dataIndex: "firstName",
      width: 100,
      render: (firstName: string, record: User) => {
        const fullName = [firstName, record.lastName].filter(Boolean).join(" ");
        return fullName || "-";
      },
    },
    {
      title: "状态",
      dataIndex: "isActive",
      width: 90,
      render: (isActive: boolean) => (
        <Tag
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
          color={isActive ? "success" : "error"}
        >
          {isActive ? "激活" : "停用"}
        </Tag>
      ),
    },
    {
      title: "最后登录",
      dataIndex: "lastLoginAt",
      width: 160,
      render: (date: Date) => (date ? new Date(date).toLocaleString("zh-CN") : "从未登录"),
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>用户管理</h1>
            </Col>
          </Row>

          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索用户名或邮箱"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="筛选状态"
              value={isActiveFilter}
              onChange={setIsActiveFilter}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value={true}>激活</Select.Option>
              <Select.Option value={false}>停用</Select.Option>
            </Select>
          </Space>

          <Table
            columns={columns}
            rowKey="id"
            dataSource={(result as any)?.data || []}
            loading={query.isLoading}
            pagination={{
              current: 1,
              pageSize: 10,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Card>
      </List>
    </div>
  );
};
