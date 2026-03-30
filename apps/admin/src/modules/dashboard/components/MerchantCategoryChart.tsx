import { useTrpcQuery } from '../../../shared/hooks/useTrpcQuery';
import { Card, Spin, Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function MerchantCategoryChart() {
  const { data, isLoading } = useTrpcQuery('statistics.getOverview', { days: 30 });

  const chartData = (data?.merchantCategoryDistribution ?? []).map((item: any) => ({
    category: item.category,
    count: item.count,
  }));

  return (
    <Card title="商户分类分布" className="chart-card">
      <Spin spinning={isLoading}>
        {chartData.length === 0 && !isLoading ? (
          <Empty description="暂无数据" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="category"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="count" name="商户数" fill="#722ed1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Spin>
    </Card>
  );
}
