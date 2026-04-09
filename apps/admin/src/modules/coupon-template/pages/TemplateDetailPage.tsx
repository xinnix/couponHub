// apps/admin/src/modules/coupon-template/pages/TemplateDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useList } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Tabs, Table, Space, App, Spin, Empty, Statistic, Row, Col } from "antd";
import { ArrowLeftOutlined, DollarOutlined, TagOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";

interface CouponTemplate {
  id: string;
  title: string;
  buyPrice: number;
  faceValue: number;
  settlementAmount?: number; // 结算金额
  stock: number;
  merchantScope: string[];
  validFrom: Date;
  validUntil: Date;
  description?: string;
  usageRules?: string; // 使用规则说明
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    orders: number;
  };
}

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: string;
  price: number;
  faceValue: number;
  createdAt: Date;
  user?: {
    id: string;
    nickname?: string;
    email: string;
  };
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  status: string;
}

export const TemplateDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('info');

  const { result: template, isLoading } = useOne<CouponTemplate>({
    resource: "couponTemplate",
    id: id!,
  });

  // 获取适用商户列表
  const { result: merchants } = useList<Merchant>({
    resource: "merchant",
    pagination: { pageSize: 100 },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!template) {
    return <Empty description="券模板不存在" />;
  }

  // 匹配适用商户
  const applicableMerchants = (merchants || []).filter(m => template.merchantScope.includes(m.id));

  const getStatusTag = () => {
    const now = new Date();
    const isExpired = new Date(template.validUntil) < now;

    if (template.status === 'DISABLED') {
      return <Tag color="default">已停用</Tag>;
    }
    if (isExpired || template.status === 'EXPIRED') {
      return <Tag color="error">已过期</Tag>;
    }
    return <Tag color="success">上架中</Tag>;
  };

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="购买价格"
                  value={template.buyPrice}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="面值"
                  value={template.faceValue}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="剩余库存"
                  value={template.stock}
                  prefix={<TagOutlined />}
                  valueStyle={{ color: template.stock > 10 ? '#3f8600' : template.stock > 0 ? '#faad14' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已售数量"
                  value={template._count?.orders || 0}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 结算金额单独一行显示 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="结算金额"
                  value={template.settlementAmount || template.faceValue}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                  suffix={!template.settlementAmount && '(面值)'}
                />
              </Card>
            </Col>
          </Row>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="券标题" span={2}>{template.title}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag()}</Descriptions.Item>
            <Descriptions.Item label="库存">{template.stock}</Descriptions.Item>
            <Descriptions.Item label="结算金额">
              {template.settlementAmount
                ? `¥${template.settlementAmount.toFixed(2)}`
                : `¥${template.faceValue.toFixed(2)} (使用面值)`}
            </Descriptions.Item>
            <Descriptions.Item label="有效期开始">
              {dayjs(template.validFrom).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="有效期结束">
              {dayjs(template.validUntil).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(template.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(template.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="券描述" span={2}>
              {template.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="使用规则" span={2}>
              {template.usageRules || '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
    },
    {
      key: 'merchants',
      label: `适用商户 (${applicableMerchants.length})`,
      children: (
        <div style={{ padding: '24px 0' }}>
          <Table
            dataSource={applicableMerchants}
            rowKey="id"
            columns={[
              {
                title: '商户名称',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: '分类',
                dataIndex: 'category',
                key: 'category',
                render: (category: string) => <Tag color="blue">{category}</Tag>,
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>
                    {status === 'ACTIVE' ? '激活' : '停用'}
                  </Tag>
                ),
              },
            ]}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'orders',
      label: `订单列表 (${template._count?.orders || 0})`,
      children: (
        <div style={{ padding: '24px 0' }}>
          <Card>
            <Empty description="订单列表功能待完善" />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/coupon-templates")}>
            返回列表
          </Button>
        </Space>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>{template.title}</h1>
          <Space style={{ marginTop: 8 }}>
            {getStatusTag()}
            <Tag color="orange">购买价 ¥{template.buyPrice}</Tag>
            <Tag color="green">面值 ¥{template.faceValue}</Tag>
          </Space>
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