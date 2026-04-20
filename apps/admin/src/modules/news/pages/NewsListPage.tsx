// apps/admin/src/modules/news/pages/NewsListPage.tsx
import { useState } from "react";
import { useTable, useCreate, useUpdate, useDelete, useDeleteMany } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
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
  Image,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  QrcodeOutlined,
  EyeOutlined,
  FileTextOutlined,
  EyeFilled,
  StarFilled,
  NotificationFilled,
} from "@ant-design/icons";
import { NewsForm } from "../components/NewsForm";
import { useNavigate } from "react-router-dom";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";
import dayjs from "dayjs";

interface News {
  id: string;
  title: string;
  bannerUrl?: string;
  content: string;
  viewCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  isHero: boolean;
  isPopup: boolean;
  // 新增字段
  qrcodeUrl?: string;
  qrcodeGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  coupons?: Array<{
    id: string;
    couponId: string;
    coupon: {
      id: string;
      title: string;
      status: string;
    };
  }>;
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

  // 新增：小程序码相关 state
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

  // 新增：直接使用 tRPC mutation 调用生成小程序码
  const generateQrcodeMutation = useMutation({
    mutationFn: async (newsId: string) => {
      const trpcClient = await getTrpcClient();
      return trpcClient.news.generateQrcode.mutate({ id: newsId });
    },
  });

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

  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
  } = useTable<News>({
    resource: "news",
    pagination: {
      currentPage: 1,
      pageSize: 10,
      mode: "server",
    },
    filters: {
      initial: [
        ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
        ...(statusFilter ? [{ field: "status", operator: "eq", value: statusFilter }] as any : []),
      ],
    },
  });

  const result = tableQuery.data;
  const query = tableQuery;
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

  const handleEdit = async (record: News) => {
    setEditingRecord(record);

    // 使用 getOneForAdmin 获取完整的优惠券列表（包括未开始和过期的）
    try {
      const trpcClient = (await import('../../../shared/trpc/trpcClient')).getTrpcClient();
      const fullRecord = await trpcClient.news.getOneForAdmin.query({ id: record.id });

      // 将 coupons 数组转换为 couponIds 数组
      const couponIds = fullRecord.coupons?.map((c: any) => c.couponId) || [];

      form.setFieldsValue({
        ...fullRecord,
        couponIds, // 设置优惠券ID数组
      });
    } catch (error) {
      console.error('Failed to fetch news details:', error);
      // 降级处理：使用列表数据
      form.setFieldsValue({
        ...record,
        couponIds: [],
      });
    }

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

  // 新增：显示小程序码 Modal
  const handleShowQrcode = (record: News) => {
    setCurrentQrcode({
      id: record.id,
      url: record.qrcodeUrl,
      title: record.title,
      qrcodeGeneratedAt: record.qrcodeGeneratedAt,
    });
    setQrcodeModalVisible(true);
  };

  // 新增：生成小程序码
  const handleGenerateQrcode = async () => {
    if (!currentQrcode) return;

    setGeneratingQrcode(true);
    generateQrcodeMutation.mutate(currentQrcode.id, {
      onSuccess: (data) => {
        setCurrentQrcode({
          ...currentQrcode,
          url: data.url,
          qrcodeGeneratedAt: new Date(),
        });
        message.success('小程序码生成成功');
        query.refetch();
      },
      onError: (error: any) => {
        message.error('生成失败: ' + error.message);
      },
      onSettled: () => {
        setGeneratingQrcode(false);
      },
    });
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
      dataIndex: "coupons",
      width: 120,
      render: (coupons: any[]) => {
        const count = coupons?.length || 0;
        return count > 0 ? (
          <Tag color="blue">{count} 个优惠券</Tag>
        ) : '-';
      },
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
      width: 280,  // 增加宽度
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
          {/* 新增：小程序码按钮 */}
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
              current: currentPage,
              pageSize: pageSize,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              },
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

          {/* 新增：小程序码 Modal */}
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
                    link.download = `qrcode-news-${currentQrcode.id}.png`;
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
                  <p style={{ marginTop: 12, color: '#666' }}>扫码直接进入新闻详情页面</p>
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