// apps/admin/src/modules/coupon-template/components/StockStatistics.tsx
import { Card, Row, Col, Statistic, Empty, Spin, Typography } from "antd";
import { useState, useEffect } from "react";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SyncOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";

interface StockStatisticsProps {
  templateId: string;
  startDate?: string;
  endDate?: string;
}

interface StatisticsData {
  reason: string;
  count: number;
  totalChange: number;
}

const REASON_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  ORDER_CREATE: { label: "订单创建", icon: ArrowDownOutlined, color: "#ff4d4f" },
  ORDER_CANCEL: { label: "订单取消", icon: ArrowUpOutlined, color: "#faad14" },
  REFUND: { label: "用户退款", icon: SyncOutlined, color: "#52c41a" },
  EXPIRED_REFUND: { label: "过期退款", icon: SyncOutlined, color: "#13c2c2" },
  MANUAL_ADJUST: { label: "手动调整", icon: ToolOutlined, color: "#722ed1" },
};

export const StockStatistics = ({
  templateId,
  startDate,
  endDate,
}: StockStatisticsProps) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData[]>([]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.stockLog.getStatistics.query({
        templateId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      console.log('Stock statistics result:', result); // 调试日志

      setStatistics(result || []);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [templateId, startDate, endDate]);

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (statistics.length === 0) {
    return (
      <Card>
        <Empty description="暂无统计数据" />
      </Card>
    );
  }

  const totalChange = statistics.reduce((sum, stat) => sum + stat.totalChange, 0);
  const totalCount = statistics.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <Card title="库存变更统计">
      <Row gutter={[16, 16]}>
        {/* 总计 */}
        <Col span={24}>
          <Card style={{ background: "#f0f2f5" }}>
            <Statistic
              title="库存总变化"
              value={totalChange}
              prefix={totalChange > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{
                color: totalChange > 0 ? "#52c41a" : "#ff4d4f",
                fontSize: 24,
              }}
              suffix={`张 / ${totalCount} 次变更`}
            />
          </Card>
        </Col>

        {/* 各原因统计 */}
        {statistics.map((stat) => {
          const config = REASON_CONFIG[stat.reason] || {
            label: stat.reason,
            icon: SyncOutlined,
            color: "#8c8c8c",
          };

          return (
            <Col span={6} key={stat.reason}>
              <Card>
                <Statistic
                  title={config.label}
                  value={stat.count}
                  suffix="次"
                  prefix={<config.icon style={{ color: config.color }} />}
                />
                <div style={{ marginTop: 8 }}>
                  <Typography.Text
                    type="secondary"
                    style={{
                      color: stat.totalChange > 0 ? "#52c41a" : "#ff4d4f",
                    }}
                  >
                    {stat.totalChange > 0 ? "+" : ""}{stat.totalChange} 张
                  </Typography.Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
};