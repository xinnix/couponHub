import { useTrpcQuery } from '../../../shared/hooks/useTrpcQuery';
import { Card, Spin, Empty } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

export function OrderTrendChart() {
  const { data, isLoading } = useTrpcQuery('statistics.getOrderTrend', { days: 30 });

  const chartData = (data ?? []).map((item: any) => ({
    ...item,
    date: dayjs(item.date).format('MM-DD'),
  }));

  return (
    <Card title="近30天交易趋势" className="chart-card">
      <Spin spinning={isLoading}>
        {chartData.length === 0 && !isLoading ? (
          <Empty description="暂无数据" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orderCount"
                name="订单数"
                stroke="#1890ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="交易额"
                stroke="#52c41a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Spin>
    </Card>
  );
}
