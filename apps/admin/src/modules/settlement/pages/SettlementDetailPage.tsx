// apps/admin/src/modules/settlement/pages/SettlementDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useUpdate } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Space, App, Spin, Empty, Tabs, Alert, Statistic, Row, Col } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, DollarOutlined, LockOutlined, DownloadOutlined } from "@ant-design/icons";
import { SettlementSnapshot } from "../components/SettlementSnapshot";
import { formatCurrency, toNumber } from "../../../shared/utils/decimal";
import { trpcClient } from "../../../shared/dataProvider/dataProvider";
import dayjs from "dayjs";
import { useState } from "react";

interface Settlement {
  id: string;
  merchantId: string;
  period: string;
  totalAmount: number;
  orderCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PAID';
  snapshotData: any;
  confirmedAt?: Date;
  confirmedBy?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  merchant?: {
    id: string;
    name: string;
    phone?: string;
    category?: {
      name: string;
    };
  };
}

export const SettlementDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

  const { result: settlement, isLoading, query } = useOne<Settlement>({
    resource: "settlement",
    id: id!,
  });

  const { mutate: update } = useUpdate();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!settlement) {
    return <Empty description="结算单不存在" />;
  }

  const getStatusTag = () => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: '待确认' },
      CONFIRMED: { color: 'processing', text: '已确认' },
      PAID: { color: 'success', text: '已支付' },
    };
    const { color, text } = config[settlement.status];
    return <Tag color={color}>{text}</Tag>;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      update(
        {
          resource: "settlement",
          id: settlement.id,
          values: { settlementId: settlement.id },
          meta: {
            method: 'confirm',
          },
        },
        {
          onSuccess: () => {
            message.success('结算单已确认');
            setLoading(false);
            query.refetch();
          },
          onError: () => {
            message.error('操作失败');
            setLoading(false);
          },
        }
      );
    } catch (error) {
      message.error('操作失败');
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      update(
        {
          resource: "settlement",
          id: settlement.id,
          values: { settlementId: settlement.id },
          meta: {
            method: 'markPaid',
          },
        },
        {
          onSuccess: () => {
            message.success('已标记为已支付');
            setLoading(false);
            query.refetch();
          },
          onError: () => {
            message.error('操作失败');
            setLoading(false);
          },
        }
      );
    } catch (error) {
      message.error('操作失败');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await trpcClient.settlement.exportExcel.mutate({ settlementId: settlement.id });

      // 创建下载链接
      const blob = new Blob(
        [Uint8Array.from(atob(data.fileContent), c => c.charCodeAt(0))],
        { type: data.mimeType }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
      setLoading(false);
    } catch (error) {
      message.error('导出失败');
      setLoading(false);
    }
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
                  title="结算金额"
                  value={settlement.totalAmount}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#52c41a', fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="订单数量"
                  value={settlement.orderCount}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均订单金额"
                  value={settlement.orderCount > 0 ? settlement.totalAmount / settlement.orderCount : 0}
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="结算期间"
                  value={settlement.period}
                />
              </Card>
            </Col>
          </Row>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="结算期间">{settlement.period}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag()}</Descriptions.Item>
            <Descriptions.Item label="商户名称">
              {settlement.merchant?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="商户分类">
              <Tag color="blue">{settlement.merchant?.category?.name || '-'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="商户电话">
              {settlement.merchant?.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="订单数量">{settlement.orderCount}</Descriptions.Item>
            <Descriptions.Item label="结算金额" span={2}>
              <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 20 }}>
                {formatCurrency(settlement.totalAmount)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="确认时间">
              {settlement.confirmedAt ? dayjs(settlement.confirmedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="支付时间">
              {settlement.paidAt ? dayjs(settlement.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(settlement.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(settlement.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>

          {settlement.status !== 'PAID' && (
            <Card style={{ marginTop: 24 }}>
              <Space>
                {settlement.status === 'PENDING' && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={loading}
                    onClick={handleConfirm}
                  >
                    确认结算
                  </Button>
                )}
                {settlement.status === 'CONFIRMED' && (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    loading={loading}
                    onClick={handleMarkPaid}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    标记已支付
                  </Button>
                )}
                <Button
                  icon={<DownloadOutlined />}
                  loading={loading}
                  onClick={handleExport}
                >
                  导出 Excel
                </Button>
              </Space>
            </Card>
          )}
          {settlement.status === 'PAID' && (
            <Card style={{ marginTop: 24 }}>
              <Button
                icon={<DownloadOutlined />}
                loading={loading}
                onClick={handleExport}
              >
                导出 Excel
              </Button>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'snapshot',
      label: '订单快照',
      children: (
        <div style={{ padding: '24px 0' }}>
          {settlement.status === 'PENDING' && (
            <Alert
              message="快照说明"
              description="此快照记录了生成结算单时该商户在指定期间内的所有已核销订单。这些订单已被锁定，不能进行退款操作。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
              icon={<LockOutlined />}
            />
          )}
          <SettlementSnapshot snapshotData={settlement.snapshotData} />
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/settlements")}>
            返回列表
          </Button>
        </Space>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>
            结算单详情 - {settlement.period}
          </h1>
          <Space style={{ marginTop: 8 }}>
            <Tag color="blue">{settlement.merchant?.name}</Tag>
            {getStatusTag()}
            <span style={{ fontSize: 14, color: '#8c8c8c' }}>
              {settlement.orderCount} 笔订单
            </span>
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