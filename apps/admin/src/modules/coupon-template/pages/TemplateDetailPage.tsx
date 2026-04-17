// apps/admin/src/modules/coupon-template/pages/TemplateDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useList } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Tabs, Table, Space, App, Spin, Empty, Statistic, Row, Col, Typography, Divider, Alert } from "antd";
import { ArrowLeftOutlined, DollarOutlined, TagOutlined, ShoppingCartOutlined, ToolOutlined, ClockCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import { StockAdjustModal } from "../components/StockAdjustModal";
import { StockLogList } from "../components/StockLogList";
import { StockStatistics } from "../components/StockStatistics";

interface UsageRules {
  stacking?: {
    type: string;
    customText?: string;
  };
  refund?: {
    type: string;
    customText?: string;
  };
  usage?: {
    type: string;
    customText?: string;
  };
}

interface CouponTemplate {
  id: string;
  title: string;
  buyPrice: number;
  faceValue: number;
  settlementAmount?: number; // 结算金额
  stock: number;
  merchantScope: string[];
  saleFrom: Date; // 销售开始时间
  saleUntil: Date; // 销售结束时间
  useFrom: Date; // 使用开始时间
  useUntil: Date; // 使用结束时间
  validDays?: number; // 相对有效天数（可选）
  description?: string;
  usageRules?: UsageRules; // 使用规则说明（JSON对象）
  featuredOnHome?: boolean; // 是否展示到首页超值优惠
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
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);

  const { result: template, isLoading, query } = useOne<CouponTemplate>({
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
  const applicableMerchants = template.merchantScope.length === 0
    ? [] // 空数组表示全商户可用，不显示具体商户列表
    : (merchants?.data || []).filter(m => template.merchantScope.includes(m.id));

  // 判断是否全商户可用
  const isAllMerchants = template.merchantScope.length === 0;

  const getStatusTag = () => {
    const now = new Date();
    const isSaleExpired = new Date(template.saleUntil) < now;
    const isUseExpired = new Date(template.useUntil) < now;

    if (template.status === 'DISABLED') {
      return <Tag color="default">已停用</Tag>;
    }
    if (isUseExpired || template.status === 'EXPIRED') {
      return <Tag color="error">已过期</Tag>;
    }
    if (isSaleExpired) {
      return <Tag color="warning">销售期已结束</Tag>;
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
                  value={Number(template.buyPrice)}
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
                  value={Number(template.faceValue)}
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
                  value={Number(template.settlementAmount || template.faceValue)}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                  suffix={!template.settlementAmount && '(面值)'}
                />
              </Card>
            </Col>
          </Row>

          {/* 有效期规则展示 */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>有效期规则</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Row gutter={16}>
              {/* 销售期 */}
              <Col span={12}>
                <Card type="inner" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Typography.Text type="secondary" strong>
                      <CalendarOutlined /> 销售期（用户可购买时间）
                    </Typography.Text>
                    <Typography.Text>
                      {dayjs(template.saleFrom).format('YYYY-MM-DD HH:mm')} 至 {dayjs(template.saleUntil).format('YYYY-MM-DD HH:mm')}
                    </Typography.Text>
                    <Tag color={new Date(template.saleUntil) > new Date() ? 'success' : 'error'}>
                      {new Date(template.saleUntil) > new Date() ? '销售进行中' : '销售已结束'}
                    </Tag>
                  </Space>
                </Card>
              </Col>

              {/* 使用期 */}
              <Col span={12}>
                <Card type="inner" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Typography.Text type="secondary" strong>
                      <CalendarOutlined /> 使用期（用户可核销时间）
                    </Typography.Text>
                    <Typography.Text>
                      {dayjs(template.useFrom).format('YYYY-MM-DD HH:mm')} 至 {dayjs(template.useUntil).format('YYYY-MM-DD HH:mm')}
                    </Typography.Text>
                    <Tag color={new Date(template.useUntil) > new Date() ? 'success' : 'error'}>
                      {new Date(template.useUntil) > new Date() ? '可正常使用' : '已过期'}
                    </Tag>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* 相对有效期说明 */}
            {template.validDays ? (
              <Alert
                type="info"
                showIcon
                message={
                  <Space direction="vertical" size="small">
                    <Typography.Text strong>相对有效期模式</Typography.Text>
                    <Typography.Text>
                      用户购买后 {template.validDays} 天内有效，但不超过使用截止时间 {dayjs(template.useUntil).format('YYYY-MM-DD HH:mm')}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      实际过期时间 = min(购买时间 + {template.validDays}天, {dayjs(template.useUntil).format('YYYY-MM-DD')})
                    </Typography.Text>
                  </Space>
                }
                style={{ marginTop: 16 }}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message={
                  <Space direction="vertical" size="small">
                    <Typography.Text strong>固定有效期模式</Typography.Text>
                    <Typography.Text>
                      所有用户统一在使用截止时间 {dayjs(template.useUntil).format('YYYY-MM-DD HH:mm')} 过期
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      无论何时购买，过期时间都相同
                    </Typography.Text>
                  </Space>
                }
                style={{ marginTop: 16 }}
              />
            )}

            {/* 时间关系提示 */}
            {new Date(template.useFrom) > new Date(template.saleUntil) && (
              <Alert
                type="warning"
                showIcon
                message={`用户购买后需等待 ${Math.ceil((new Date(template.useFrom).getTime() - new Date(template.saleUntil).getTime()) / (1000 * 60 * 60 * 24))} 天才能开始使用`}
                style={{ marginTop: 16 }}
              />
            )}
          </Card>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="券标题" span={2}>{template.title}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag()}</Descriptions.Item>
            <Descriptions.Item label="库存">
              <Space>
                <Typography.Text strong>{template.stock}</Typography.Text>
                <Button
                  type="link"
                  size="small"
                  icon={<ToolOutlined />}
                  onClick={() => setAdjustModalVisible(true)}
                >
                  调整库存
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="展示到首页超值优惠">
              {template.featuredOnHome ? <Tag color="gold">是</Tag> : <Tag color="default">否</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="结算金额">
              {template.settlementAmount
                ? `¥${Number(template.settlementAmount).toFixed(2)}`
                : `¥${Number(template.faceValue).toFixed(2)} (使用面值)`}
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
              {template.usageRules ? (
                <Space direction="vertical" size="small">
                  {template.usageRules.stacking?.type && (
                    <Typography.Text>
                      <strong>叠加规则：</strong>
                      {template.usageRules.stacking.type === 'custom'
                        ? template.usageRules.stacking.customText
                        : template.usageRules.stacking.type === 'no_stack' ? '不与其他优惠叠加'
                        : template.usageRules.stacking.type === 'limited_stack' ? '限制叠加'
                        : '可自由叠加'}
                    </Typography.Text>
                  )}
                  {template.usageRules.refund?.type && (
                    <Typography.Text>
                      <strong>退改规则：</strong>
                      {template.usageRules.refund.type === 'custom' || template.usageRules.refund.type === 'limited'
                        ? template.usageRules.refund.customText
                        : template.usageRules.refund.type === 'flexible' ? '未核销前随时退款'
                        : template.usageRules.refund.type === 'no_refund' ? '不可退款'
                        : '-'}
                    </Typography.Text>
                  )}
                  {template.usageRules.usage?.type && (
                    <Typography.Text>
                      <strong>使用规则：</strong>
                      {template.usageRules.usage.type === 'custom'
                        ? template.usageRules.usage.customText
                        : template.usageRules.usage.type === 'min_amount' ? '最低消费金额'
                        : template.usageRules.usage.type === 'time_limit' ? '时间限制'
                        : template.usageRules.usage.type === 'category' ? '商品类别限制'
                        : '-'}
                    </Typography.Text>
                  )}
                </Space>
              ) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
    },
    {
      key: 'merchants',
      label: isAllMerchants
        ? '适用商户（所有商户可用）'
        : `适用商户 (${applicableMerchants.length} 家)`,
      children: (
        <div style={{ padding: '24px 0' }}>
          {isAllMerchants ? (
            <Alert
              message="全商户可用"
              description="该优惠券适用于所有商户，任何商户的核销员都可以核销此券"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
          ) : (
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
          )}
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
    {
      key: 'stock',
      label: '库存管理',
      children: (
        <div style={{ padding: '24px 0' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 库存统计 */}
            <StockStatistics templateId={template.id} />

            {/* 库存变更历史 */}
            <StockLogList templateId={template.id} />
          </Space>
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
            <Tag color="orange">购买价 ¥{Number(template.buyPrice)}</Tag>
            <Tag color="green">面值 ¥{Number(template.faceValue)}</Tag>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* 库存调整对话框 */}
      <StockAdjustModal
        visible={adjustModalVisible}
        template={template}
        onCancel={() => setAdjustModalVisible(false)}
        onSuccess={() => {
          setAdjustModalVisible(false);
          query.refetch(); // 刷新券模板数据
        }}
      />
    </div>
  );
};