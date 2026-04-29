import { useTrpcQuery } from '../../../shared/hooks/useTrpcQuery';
import { Card, Spin, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  UNPAID: '#d9d9d9',
  PAID: '#1890ff',
  REDEEMED: '#52c41a',
  REFUNDING: '#faad14',
  REFUNDED: '#ff4d4f',
  EXPIRED: '#8c8c8c',
  CANCELLED: '#595959',
};

const STATUS_LABELS: Record<string, string> = {
  UNPAID: '待支付',
  PAID: '已支付',
  REDEEMED: '已核销',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
};

export function OrderStatusChart() {
  const { data, isLoading } = useTrpcQuery('statistics.getOverview', { days: 30 });

  const chartData = (data?.orderStatusDistribution ?? []).map((item: any) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] ?? '#8c8c8c',
  }));

  return (
    <Card title="订单状态分布" className="chart-card">
      <Spin spinning={isLoading}>
        {chartData.length === 0 && !isLoading ? (
          <Empty description="暂无数据" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Spin>
    </Card>
  );
}
