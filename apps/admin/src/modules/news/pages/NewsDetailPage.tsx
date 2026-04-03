// apps/admin/src/modules/news/pages/NewsDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Space, Empty, Spin, Divider, Image } from "antd";
import { ArrowLeftOutlined, EyeFilled, TagOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface News {
  id: string;
  title: string;
  bannerUrl?: string;
  content: string;
  linkedCouponId?: string;
  viewCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
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
            {news.linkedCouponId && (
              <Tag color="blue" icon={<TagOutlined />}>
                已关联券模板
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
          {news.linkedCouponId && (
            <Descriptions.Item label="关联券模板ID" span={2}>
              {news.linkedCouponId}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
};