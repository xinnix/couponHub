// apps/admin/src/modules/coupon-template/components/StockLogList.tsx
import { Table, Tag, Space, Typography, Card, DatePicker, Select, Button, Empty, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";

interface StockLog {
  id: string;
  templateId: string;
  template?: {
    id: string;
    title: string;
    status: string;
  };
  changeAmount: number;
  currentStock: number;
  reason: string;
  orderId?: string;
  order?: {
    id: string;
    orderNo: string;
    status: string;
  };
  adminId?: string;
  admin?: {
    id: string;
    username: string;
  };
  createdAt: string;
}

interface StockLogListProps {
  templateId: string;
}

const REASON_MAP: Record<string, { label: string; color: string }> = {
  ORDER_CREATE: { label: "创建订单", color: "blue" },
  ORDER_CANCEL: { label: "订单取消", color: "orange" },
  REFUND: { label: "用户退款", color: "cyan" },
  EXPIRED_REFUND: { label: "过期退款", color: "purple" },
  MANUAL_ADJUST: { label: "手动调整", color: "gold" },
};

export const StockLogList = ({ templateId }: StockLogListProps) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.stockLog.getLogsByTemplate.query({
        templateId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        reason: reasonFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      console.log('Stock logs result:', result); // 调试日志

      setLogs(result.logs || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Failed to fetch stock logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [templateId, page, pageSize, startDate, endDate, reasonFilter]);

  const columns = [
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "变更原因",
      dataIndex: "reason",
      key: "reason",
      width: 120,
      render: (reason: string) => {
        const config = REASON_MAP[reason] || { label: reason, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "变更量",
      dataIndex: "changeAmount",
      key: "changeAmount",
      width: 100,
      render: (amount: number) => (
        <Typography.Text
          style={{
            color: amount > 0 ? "#52c41a" : "#ff4d4f",
            fontWeight: "bold",
          }}
        >
          {amount > 0 ? `+${amount}` : amount}
        </Typography.Text>
      ),
    },
    {
      title: "当前库存",
      dataIndex: "currentStock",
      key: "currentStock",
      width: 100,
      render: (stock: number) => (
        <Typography.Text strong>{stock}</Typography.Text>
      ),
    },
    {
      title: "关联订单",
      dataIndex: "order",
      key: "order",
      width: 150,
      render: (order: any) =>
        order ? (
          <Space direction="vertical" size="small">
            <Typography.Text>{order.orderNo}</Typography.Text>
            <Tag color={order.status === "PAID" ? "success" : "default"}>
              {order.status}
            </Tag>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "操作员",
      dataIndex: "admin",
      key: "admin",
      width: 100,
      render: (admin: any) =>
        admin ? (
          <Typography.Text>{admin.username}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">系统自动</Typography.Text>
        ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Space wrap>
            <DatePicker.RangePicker
              placeholder={["开始日期", "结束日期"]}
              onChange={(dates) => {
                setStartDate(dates?.[0]?.toISOString() || null);
                setEndDate(dates?.[1]?.toISOString() || null);
              }}
            />
            <Select
              placeholder="筛选原因"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setReasonFilter(value)}
              options={[
                { label: "创建订单", value: "ORDER_CREATE" },
                { label: "订单取消", value: "ORDER_CANCEL" },
                { label: "用户退款", value: "REFUND" },
                { label: "过期退款", value: "EXPIRED_REFUND" },
                { label: "手动调整", value: "MANUAL_ADJUST" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
              刷新
            </Button>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
          </div>
        ) : logs.length === 0 ? (
          <Empty description="暂无库存变更记录" />
        ) : (
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        )}
      </Space>
    </Card>
  );
};