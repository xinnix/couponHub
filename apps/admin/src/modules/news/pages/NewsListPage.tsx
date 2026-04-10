// apps/admin/src/modules/news/pages/NewsListPage.tsx
import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useDeleteMany } from "@refinedev/core";
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
  Statistic,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  EyeFilled,
  StarFilled,
  NotificationFilled,
} from "@ant-design/icons";
import { NewsForm } from "../components/NewsForm";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface News {
  id: string;
  title: string;
  bannerUrl?: string;
  content: string;
  linkedCouponId?: string;
  viewCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  isHero: boolean;
  isPopup: boolean; // 新增字段
  createdAt: Date;
  updatedAt: Date;
}

export const NewsListPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<News | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: deleteOne } = useDelete();
  const { mutate: deleteMany } = useDeleteMany();

  // 处理删除单条新闻
  const handleDelete = (id: string) => {
    deleteOne(
      { resource: "news", id },
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

  const { result, query } = useList<News>({
    resource: "news",
    pagination: {
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
      ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
    ],
  });

  const news = (result as any)?.data || [];

  // 统计数据
  const publishedCount = news.filter((n: News) => n.status === 'PUBLISHED').length;
  const draftCount = news.filter((n: News) => n.status === 'DRAFT').length;
  const popupCount = news.filter((n: News) => n.isPopup && n.status === 'PUBLISHED').length;
  const totalViews = news.reduce((sum: number, n: News) => sum + n.viewCount, 0);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: News) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleToggleStatus = async (record: News) => {
    const newStatus = record.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    update(
      {
        resource: "news",
        id: record.id,
        values: { status: newStatus },
      },
      {
        onSuccess: () => {
          message.success(newStatus === 'PUBLISHED' ? "新闻已发布" : "新闻已下架");
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
            resource: "news",
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
            resource: "news",
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
      message.warning("请选择要删除的新闻");
      return;
    }

    deleteMany(
      {
        resource: "news",
        ids: selectedRowKeys,
      },
      {
        onSuccess: () => {
          message.success(`成功删除 ${selectedRowKeys.length} 条新闻`);
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
      title: "标题",
      dataIndex: "title",
      width: 300,
      render: (title: string, record: News) => (
        <Space>
          {record.bannerUrl && (
            <img
              src={record.bannerUrl}
              alt={title}
              style={{ width: 60, height: 40, borderRadius: 4, objectFit: 'cover' }}
            />
          )}
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string, record: News) => (
        <Button
          size="small"
          type="text"
          onClick={() => handleToggleStatus(record)}
        >
          <Tag color={status === 'PUBLISHED' ? 'success' : 'default'}>
            {status === 'PUBLISHED' ? '已发布' : '草稿'}
          </Tag>
        </Button>
      ),
    },
    {
      title: "浏览量",
      dataIndex: "viewCount",
      width: 100,
      render: (count: number) => (
        <Space>
          <EyeFilled />
          <span>{count || 0}</span>
        </Space>
      ),
    },
    {
      title: "关联券",
      dataIndex: "linkedCouponId",
      width: 100,
      render: (id: string) => id ? <Tag color="blue">已关联</Tag> : '-',
    },
    {
      title: "头图",
      dataIndex: "isHero",
      width: 100,
      render: (isHero: boolean) => (
        <Tag color={isHero ? 'gold' : 'default'} icon={isHero ? <StarFilled /> : null}>
          {isHero ? 'Hero' : '普通'}
        </Tag>
      ),
    },
    // 新增：弹窗列
    {
      title: "弹窗",
      dataIndex: "isPopup",
      width: 100,
      render: (isPopup: boolean) => (
        <Tag color={isPopup ? 'purple' : 'default'} icon={isPopup ? <NotificationFilled /> : null}>
          {isPopup ? '弹窗' : '普通'}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: "操作",
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: News) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/news/${record.id}`)}
          >
            查看
          </Button>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
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
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>新闻管理</h1>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建新闻
              </Button>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已发布"
                  value={publishedCount}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="草稿"
                  value={draftCount}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="弹窗新闻"
                  value={popupCount}
                  prefix={<NotificationFilled />}
                  valueStyle={{ color: '#722ed1' }}
                  suffix={popupCount > 1 ? '/ 1' : ''}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总浏览量"
                  value={totalViews}
                  prefix={<EyeFilled />}
                />
              </Card>
            </Col>
          </Row>

          {/* Search and Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索新闻标题"
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
              <Select.Option value="PUBLISHED">已发布</Select.Option>
              <Select.Option value="DRAFT">草稿</Select.Option>
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
                description={`将删除 ${selectedRowKeys.length} 条新闻`}
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
            dataSource={news}
            loading={query.isLoading}
            scroll={{ x: 1300 }}
            pagination={{
              current: 1,
              pageSize: 10,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <Modal
            title={editingRecord ? "编辑新闻" : "新建新闻"}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="确定"
            cancelText="取消"
            width={900}
          >
            <NewsForm form={form} isEdit={!!editingRecord} />
          </Modal>
        </Card>
      </List>
    </div>
  );
};