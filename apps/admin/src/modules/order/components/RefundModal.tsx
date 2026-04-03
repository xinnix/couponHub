// apps/admin/src/modules/order/components/RefundModal.tsx
import { Modal, Descriptions, Input, App, Button, Space, Divider } from 'antd';
import { useUpdate } from '@refinedev/core';
import { useState } from 'react';
import { formatCurrency } from '../../../shared/utils/decimal';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface Order {
  id: string;
  orderNo: string;
  price: number;
  faceValue: number;
  refundReason?: string;
  user?: {
    nickname?: string;
    email: string;
    phone?: string;
  };
  template?: {
    title: string;
  };
  paidAt?: Date;
}

interface RefundModalProps {
  visible: boolean;
  order: Order | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ visible, order, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [approveReason, setApproveReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { mutate: update } = useUpdate();

  const handleApproveRefund = async () => {
    if (!order) return;

    setLoading(true);
    try {
      // TODO: 后端需要实现 order.approveRefund API
      update(
        {
          resource: "order",
          id: order.id,
          values: { status: 'REFUNDED' },
          meta: {
            method: 'approveRefund',
          },
        },
        {
          onSuccess: () => {
            message.success('退款已确认');
            setLoading(false);
            onSuccess();
          },
          onError: () => {
            message.error('操作失败，请稍后重试');
            setLoading(false);
          },
        }
      );
    } catch (error) {
      message.error('操作失败');
      setLoading(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!order) return;

    if (!rejectReason.trim()) {
      message.warning('请填写拒绝退款原因');
      return;
    }

    setLoading(true);
    try {
      // TODO: 后端需要实现 order.rejectRefund API
      update(
        {
          resource: "order",
          id: order.id,
          values: {
            status: 'PAID',
            rejectReason: rejectReason,
          },
          meta: {
            method: 'rejectRefund',
          },
        },
        {
          onSuccess: () => {
            message.success('已拒绝退款');
            setLoading(false);
            onSuccess();
          },
          onError: () => {
            message.error('操作失败，请稍后重试');
            setLoading(false);
          },
        }
      );
    } catch (error) {
      message.error('操作失败');
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal
      title="退款审核"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="订单号" span={2}>
          <span style={{ fontFamily: 'monospace' }}>{order.orderNo}</span>
        </Descriptions.Item>
        <Descriptions.Item label="用户手机">
          {order.user?.phone || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="券标题">
          {order.template?.title}
        </Descriptions.Item>
        <Descriptions.Item label="购买价格">
          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatCurrency(order.price)}</span>
        </Descriptions.Item>
        <Descriptions.Item label="面值">
          <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(order.faceValue)}</span>
        </Descriptions.Item>
        <Descriptions.Item label="支付时间">
          {order.paidAt ? dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="退款申请时间">
          {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="退款原因" span={2}>
          {order.refundReason || '未填写'}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8 }}>确认退款</h4>
        <TextArea
          rows={3}
          placeholder="备注信息（可选）"
          value={approveReason}
          onChange={(e) => setApproveReason(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <Button
          type="primary"
          danger
          loading={loading}
          onClick={handleApproveRefund}
        >
          确认退款
        </Button>
      </div>

      <Divider />

      <div>
        <h4 style={{ marginBottom: 8 }}>拒绝退款</h4>
        <TextArea
          rows={3}
          placeholder="请填写拒绝退款原因"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <Button
          type="default"
          loading={loading}
          onClick={handleRejectRefund}
        >
          拒绝退款
        </Button>
      </div>
    </Modal>
  );
};