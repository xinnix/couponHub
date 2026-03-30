import { useTrpcQuery } from '../../../shared/hooks/useTrpcQuery';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { formatCurrency } from '../../../shared/utils/decimal';

export function OverviewStats() {
  const { data, isLoading } = useTrpcQuery('statistics.getOverview', { days: 30 });

  const stats = [
    {
      title: '用户总数',
      value: data?.userCount ?? 0,
      icon: <UserOutlined />,
      color: '#1890ff',
    },
    {
      title: '活跃商户',
      value: data?.merchantCount ?? 0,
      icon: <ShopOutlined />,
      color: '#52c41a',
    },
    {
      title: '总订单',
      value: data?.totalOrders ?? 0,
      icon: <ShoppingCartOutlined />,
      color: '#722ed1',
    },
    {
      title: '总交易额',
      value: formatCurrency(data?.totalRevenue ?? 0),
      icon: <DollarOutlined />,
      color: '#fa8c16',
    },
    {
      title: '近30天订单',
      value: data?.recentOrders ?? 0,
      icon: <RiseOutlined />,
      color: '#13c2c2',
    },
    {
      title: '近30天收入',
      value: formatCurrency(data?.recentRevenue ?? 0),
      icon: <ThunderboltOutlined />,
      color: '#eb2f96',
    },
  ];

  return (
    <Spin spinning={isLoading}>
      <Row gutter={[16, 16]} className="stats-row">
        {stats.map((item) => (
          <Col xs={12} sm={8} lg={4} key={item.title}>
            <Card size="small">
              <Statistic
                title={item.title}
                value={item.value}
                prefix={
                  <span style={{ color: item.color, marginRight: 4 }}>{item.icon}</span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Spin>
  );
}
