import './DashboardPage.css';
import { Row, Col } from 'antd';
import { OverviewStats } from '../components/OverviewStats';
import { OrderTrendChart } from '../components/OrderTrendChart';
import { OrderStatusChart } from '../components/OrderStatusChart';
import { MerchantCategoryChart } from '../components/MerchantCategoryChart';
import { RecentOrdersTable } from '../components/RecentOrdersTable';

export function DashboardPage() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>数据总览</h1>
        <p>平台核心经营数据实时概览</p>
      </div>

      <OverviewStats />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <OrderTrendChart />
        </Col>
        <Col xs={24} lg={8}>
          <OrderStatusChart />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <MerchantCategoryChart />
        </Col>
        <Col xs={24} lg={16}>
          <RecentOrdersTable />
        </Col>
      </Row>
    </div>
  );
}
