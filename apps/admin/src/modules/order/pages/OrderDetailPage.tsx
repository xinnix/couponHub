// apps/admin/src/modules/order/pages/OrderDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Space, Spin, Empty, Timeline, Alert } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { OrderStatusTag } from "../components/OrderStatusTag";
import { formatCurrency } from "../../../shared/utils/decimal";
import dayjs from "dayjs";

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  templateId: string;
  status: 'UNPAID' | 'PAID' | 'REDEEMED' | 'REFUNDING' | 'REFUNDED' | 'EXPIRED';
  payId?: string;
  paidAt?: Date;
  redeemMerchantId?: string;
  redeemedAt?: Date;
  refundId?: string;
  refundReason?: string;
  refundedAt?: Date;
  price: number;
  faceValue: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    nickname?: string;
    email: string;
    phone?: string;
  };
  template?: {
    id: string;
    title: string;
  };
  merchant?: {
    id: string;
    name: string;
    category: string;
  };
}

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: orderData, isLoading } = useOne<Order>({
    resource: "order",
    id: id!,
  });

  const order = orderData?.data;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return <Empty description="订单不存在" />;
  }

  const getTimelineItems = () => {
    const items: any[] = [];

    // 创建订单
    items.push({
      color: 'blue',
      dot: <ClockCircleOutlined />,
      children: (
        <>
          <p style={{ margin: 0, fontWeight: 'bold' }}>创建订单</p>
          <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>
            {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </>
      ),
    });

    // 支付
    if (order.paidAt) {
      items.push({
        color: 'green',
        dot: <CheckCircleOutlined />,
        children: (
          <>
            <p style={{ margin: 0, fontWeight: 'bold' }}>支付成功</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>
              {dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>支付订单号: {order.payId}</p>
          </>
        ),
      });
    }

    // 核销
    if (order.redeemedAt && order.merchant) {
      items.push({
        color: 'blue',
        dot: <CheckCircleOutlined />,
        children: (
          <>
            <p style={{ margin: 0, fontWeight: 'bold' }}>已核销</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>
              {dayjs(order.redeemedAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>核销商户: {order.merchant.name}</p>
          </>
        ),
      });
    }

    // 退款申请
    if (order.status === 'REFUNDING') {
      items.push({
        color: 'orange',
        dot: <SyncOutlined spin />,
        children: (
          <>
            <p style={{ margin: 0, fontWeight: 'bold' }}>申请退款</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>等待审核</p>
            {order.refundReason && (
              <p style={{ margin: 0, fontSize: 12 }}>原因: {order.refundReason}</p>
            )}
          </>
        ),
      });
    }

    // 退款完成
    if (order.refundedAt) {
      items.push({
        color: 'red',
        dot: <CloseCircleOutlined />,
        children: (
          <>
            <p style={{ margin: 0, fontWeight: 'bold' }}>已退款</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>
              {dayjs(order.refundedAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            {order.refundId && (
              <p style={{ margin: 0, fontSize: 12 }}>退款单号: {order.refundId}</p>
            )}
          </>
        ),
      });
    }

    // 过期
    if (order.status === 'EXPIRED') {
      items.push({
        color: 'gray',
        dot: <CloseCircleOutlined />,
        children: (
          <>
            <p style={{ margin: 0, fontWeight: 'bold' }}>订单已过期</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}>超时未支付</p>
          </>
        ),
      });
    }

    return items;
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orders")}>
            返回列表
          </Button>
        </Space>

        {order.isLocked && (
          <Alert
            message="此订单已结算锁定"
            description="该订单已被结算单锁定，不能进行退款操作。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>订单详情</h1>
          <Space style={{ marginTop: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#8c8c8c' }}>
              订单号: {order.orderNo}
            </span>
            <OrderStatusTag status={order.status} />
            {order.isLocked && <Tag color="warning">已锁定</Tag>}
          </Space>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="订单号">
                <span style={{ fontFamily: 'monospace' }}>{order.orderNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {order.user?.nickname || order.user?.email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户手机">
                {order.user?.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="券标题">
                {order.template?.title || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="购买价格">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16 }}>
                  {formatCurrency(order.price)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="面值">
                <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>
                  {formatCurrency(order.faceValue)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <OrderStatusTag status={order.status} />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="订单流程">
            <Timeline items={getTimelineItems()} />
          </Card>

          {order.merchant && (
            <Card title="核销信息" style={{ marginBottom: 24 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="核销商户">
                  {order.merchant.name}
                </Descriptions.Item>
                <Descriptions.Item label="商户分类">
                  <Tag color="blue">{order.merchant.category}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="核销时间">
                  {order.redeemedAt ? dayjs(order.redeemedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {order.status === 'REFUNDING' && order.refundReason && (
            <Card title="退款申请信息">
              <Descriptions column={1}>
                <Descriptions.Item label="退款原因">
                  {order.refundReason}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};