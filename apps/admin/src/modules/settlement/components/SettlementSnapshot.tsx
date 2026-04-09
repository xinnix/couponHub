// apps/admin/src/modules/settlement/components/SettlementSnapshot.tsx
import { Table, Card, Empty } from 'antd';
import { formatCurrency, toNumber } from '../../../shared/utils/decimal';
import dayjs from 'dayjs';

interface SnapshotData {
  orders: Array<{
    orderId: string;
    orderNo: string;
    userId: string;
    templateId: string;
    price: number;
    faceValue: number;
    settlementAmount: number; // 结算金额
    redeemedAt: string;
  }>;
  generatedAt: string;
  generatedBy: string;
}

interface SettlementSnapshotProps {
  snapshotData: SnapshotData | null;
}

export const SettlementSnapshot: React.FC<SettlementSnapshotProps> = ({ snapshotData }) => {
  if (!snapshotData || !snapshotData.orders || snapshotData.orders.length === 0) {
    return <Empty description="暂无订单数据" />;
  }

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      render: (orderNo: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{orderNo}</span>
      ),
    },
    {
      title: '购买价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: any) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatCurrency(price)}</span>
      ),
    },
    {
      title: '面值',
      dataIndex: 'faceValue',
      key: 'faceValue',
      width: 100,
      render: (value: any) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      title: '结算金额',
      dataIndex: 'settlementAmount',
      key: 'settlementAmount',
      width: 100,
      render: (value: any) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      title: '核销时间',
      dataIndex: 'redeemedAt',
      key: 'redeemedAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 计算汇总
  const totalAmount = snapshotData.orders.reduce((sum, order) => sum + toNumber(order.price), 0);
  const totalFaceValue = snapshotData.orders.reduce((sum, order) => sum + toNumber(order.faceValue), 0);
  const totalSettlementAmount = snapshotData.orders.reduce((sum, order) => sum + toNumber(order.settlementAmount), 0);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {snapshotData.orders.length}
            </div>
            <div style={{ fontSize: 14, color: '#8c8c8c' }}>订单数量</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
              {formatCurrency(totalAmount)}
            </div>
            <div style={{ fontSize: 14, color: '#8c8c8c' }}>总购买金额</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrency(totalFaceValue)}
            </div>
            <div style={{ fontSize: 14, color: '#8c8c8c' }}>总面值</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {formatCurrency(totalSettlementAmount)}
            </div>
            <div style={{ fontSize: 14, color: '#8c8c8c' }}>总结算金额</div>
          </div>
        </div>
      </Card>

      <Table
        dataSource={snapshotData.orders}
        columns={columns}
        rowKey="orderId"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 600 }}
      />

      <div style={{ marginTop: 16, fontSize: 12, color: '#8c8c8c' }}>
        <p>快照生成时间: {dayjs(snapshotData.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
        {snapshotData.generatedBy && <p>生成人: {snapshotData.generatedBy}</p>}
      </div>
    </div>
  );
};