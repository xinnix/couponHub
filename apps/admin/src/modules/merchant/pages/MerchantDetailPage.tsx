// apps/admin/src/modules/merchant/pages/MerchantDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Tabs, Table, Space, Spin, Empty, App } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, StopOutlined, EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { HandlerList } from "../components/HandlerList";

interface Merchant {
  id: string;
  name: string;
  logo?: string;
  category: string;
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

interface MerchantHandler {
  id: string;
  merchantId: string;
  userId: string;
  name: string;
  phone: string;
  isActive: boolean;
  user?: {
    id: string;
    nickname: string;
    phone: string;
  };
}

export const MerchantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const { message } = App.useApp();

  const { result: merchant, isLoading } = useOne<Merchant>({
    resource: "merchant",
    id: id!,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!merchant) {
    return <Empty description="商户不存在" />;
  }

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="商户名称">{merchant.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={merchant.status === 'ACTIVE' ? 'success' : 'error'}>
              {merchant.status === 'ACTIVE' ? '激活' : '停用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="商户分类">
            <Tag color="blue">{merchant.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区域">
            {merchant.area ? <Tag color="geekblue">{merchant.area}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="楼层">{merchant.floor || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{merchant.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="核销员数量">{merchant._count?.handlers || 0}</Descriptions.Item>
          <Descriptions.Item label="核销订单">{merchant._count?.orders || 0}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(merchant.createdAt).toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(merchant.updatedAt).toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="商户描述" span={2}>
            {merchant.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'handlers',
      label: `核销员管理`,
      children: (
        <HandlerList merchantId={merchant.id} />
      ),
    },
    {
      key: 'orders',
      label: `核销记录 (${merchant._count?.orders || 0})`,
      children: (
        <div style={{ padding: '24px 0' }}>
          <Card>
            <Empty description="核销记录功能待后端API完善" />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/merchants")}>
            返回列表
          </Button>
        </Space>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          {merchant.logo && (
            <img
              src={merchant.logo}
              alt={merchant.name}
              style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginRight: 16 }}
            />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>{merchant.name}</h1>
            <Space style={{ marginTop: 8 }}>
              <Tag color="blue">{merchant.category}</Tag>
              {merchant.area && <Tag color="geekblue">{merchant.area}</Tag>}
              {merchant.floor && <Tag>{merchant.floor}</Tag>}
              <Tag color={merchant.status === 'ACTIVE' ? 'success' : 'error'}>
                {merchant.status === 'ACTIVE' ? '激活' : '停用'}
              </Tag>
            </Space>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};