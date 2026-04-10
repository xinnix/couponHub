// apps/admin/src/modules/news/pages/NewsDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Space, Empty, Spin, Divider, Image, Table } from "antd";
import { ArrowLeftOutlined, EyeFilled, TagOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface News {
  id: string;
  title: string;
  bannerUrl?: string;
  content: string;
  viewCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
  coupons?: any[];
}

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { result: news, isLoading } = useOne<News>({
    resource: "news",
    id: id!,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!news) {
    return <Empty description="新闻不存在" />;
  }

  // 优惠券列表列定义
  const couponColumns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 80,
    },
    {
      title: '优惠券标题',
      dataIndex: ['coupon', 'title'],
      key: 'title',
    },
    {
      title: '价格',
      dataIndex: ['coupon', 'buyPrice'],
      key: 'buyPrice',
      render: (price: number) => `¥${price}`,
    },
    {
      title: '面值',
      dataIndex: ['coupon', 'faceValue'],
      key: 'faceValue',
      render: (value: number) => `¥${value}`,
    },
    {
      title: '状态',
      dataIndex: ['coupon', 'status'],
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          ACTIVE: 'success',
          EXPIRED: 'warning',
          DISABLED: 'default',
        };
        const textMap: Record<string, string> = {
          ACTIVE: '正常',
          EXPIRED: '已过期',
          DISABLED: '已下架',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/coupon-template/show/${record.coupon.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/news")}>
            返回列表
          </Button>
        </Space>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>{news.title}</h1>
          <Space style={{ marginTop: 8 }}>
            <Tag color={news.status === 'PUBLISHED' ? 'success' : 'default'}>
              {news.status === 'PUBLISHED' ? '已发布' : '草稿'}
            </Tag>
            <Space>
              <EyeFilled />
              <span>{news.viewCount || 0} 次浏览</span>
            </Space>
            {news.coupons && news.coupons.length > 0 && (
              <Tag color="blue" icon={<TagOutlined />}>
                关联 {news.coupons.length} 个优惠券
              </Tag>
            )}
          </Space>
        </div>

        {news.bannerUrl && (
          <div style={{ marginBottom: 24 }}>
            <Image
              src={news.bannerUrl}
              alt={news.title}
              style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 8 }}
            />
          </div>
        )}

        <Card style={{ marginBottom: 24 }}>
          <div
            dangerouslySetInnerHTML={{ __html: news.content }}
            style={{ minHeight: 200 }}
          />
        </Card>

        {/* 关联优惠券表格 */}
        {news.coupons && news.coupons.length > 0 && (
          <Card title="关联优惠券" style={{ marginBottom: 24 }}>
            <Table
              dataSource={news.coupons}
              columns={couponColumns}
              rowKey="id"
              pagination={false}
            />
          </Card>
        )}

        <Divider />

        <Descriptions bordered column={2}>
          <Descriptions.Item label="创建时间">
            {dayjs(news.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dayjs(news.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={news.status === 'PUBLISHED' ? 'success' : 'default'}>
              {news.status === 'PUBLISHED' ? '已发布' : '草稿'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="浏览量">
            {news.viewCount || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};