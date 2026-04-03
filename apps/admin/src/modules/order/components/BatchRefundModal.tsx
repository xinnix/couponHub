// apps/admin/src/modules/order/components/BatchRefundModal.tsx
import { Modal, Table, App, Button, Alert } from "antd";
import { useList, useUpdate } from "@refinedev/core";
import { useState } from "react";
import dayjs from "dayjs";
import { OrderStatusTag } from "./OrderStatusTag";
import { formatCurrency } from "../../../shared/utils/decimal";

interface Order {
  id: string;
  orderNo: string;
  status: string;
  price: number;
  faceValue: number;
  user?: {
    nickname?: string;
    email: string;
    phone?: string;
  };
  template?: {
    title: string;
  };
  createdAt: Date;
  isLocked: boolean;
}

interface BatchRefundModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const BatchRefundModal: React.FC<BatchRefundModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { mutate: update } = useUpdate();

  const { result, query } = useList<Order>({
    resource: "order",
    pagination: {
      pageSize: 100,
    },
    filters: [{ field: "status", operator: "eq", value: "REFUNDING" }],
  });

  const orders = (result as any)?.data || [];

  const handleBatchRefund = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要退款的订单");
      return;
    }

    // 检查是否有锁定的订单
    const lockedOrders = orders.filter(
      (o: Order) => selectedRowKeys.includes(o.id) && o.isLocked,
    );
    if (lockedOrders.length > 0) {
      message.error("已选订单中有结算锁定的订单，不能退款");
      return;
    }

    setLoading(true);
    try {
      // TODO: 后端需要实现 order.batchRefund API
      // 目前使用循环单个处理
      let successCount = 0;
      let failCount = 0;

      for (const orderId of selectedRowKeys) {
        try {
          await new Promise((resolve, reject) => {
            update(
              {
                resource: "order",
                id: orderId,
                values: { status: "REFUNDED" },
                meta: {
                  method: "approveRefund",
                },
              },
              {
                onSuccess: () => resolve(true),
                onError: () => reject(false),
              },
            );
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      setLoading(false);
      message.success(
        `成功退款 ${successCount} 个订单${failCount > 0 ? `，失败 ${failCount} 个` : ""}`,
      );
      setSelectedRowKeys([]);
      onSuccess();
    } catch (error) {
      setLoading(false);
      message.error("批量退款失败");
    }
  };

  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 180,
      render: (orderNo: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{orderNo}</span>
      ),
    },
    {
      title: "用户手机",
      width: 130,
      render: (_: any, record: Order) => (
        <span>{record.user?.phone || "-"}</span>
      ),
    },
    {
      title: "券标题",
      width: 180,
      render: (_: any, record: Order) => record.template?.title || "-",
    },
    {
      title: "购买价",
      dataIndex: "price",
      width: 90,
      render: (price: any) => formatCurrency(price),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: any) => <OrderStatusTag status={status} />,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (date: Date) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "锁定",
      dataIndex: "isLocked",
      width: 70,
      render: (isLocked: boolean) => (isLocked ? "是" : "否"),
    },
  ];

  return (
    <Modal
      title="批量退款"
      open={visible}
      onCancel={onCancel}
      onOk={handleBatchRefund}
      okText="确认批量退款"
      okButtonProps={{ loading, danger: true }}
      width={1200}
    >
      <Alert
        message="注意事项"
        description="只能退款状态为「退款中」且未结算锁定的订单。已锁定的订单不能退款。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <span>
          共找到 {orders.length} 个待退款订单，已选择 {selectedRowKeys.length}{" "}
          个
        </span>
      </div>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
          getCheckboxProps: (record: Order) => ({
            disabled: record.isLocked,
          }),
        }}
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={query.isLoading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1000 }}
      />
    </Modal>
  );
};
