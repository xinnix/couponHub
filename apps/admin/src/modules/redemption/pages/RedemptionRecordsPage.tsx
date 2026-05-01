// apps/admin/src/modules/redemption/pages/RedemptionRecordsPage.tsx
import React, { useState } from "react";
import { useTable, useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import {
  Table,
  Card,
  Row,
  Col,
  Space,
  Select,
  DatePicker,
  Statistic,
  Tag,
  Empty,
} from "antd";
import {
  CheckCircleOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { toNumber, formatCurrency } from "../../../shared/utils/decimal";
import { useTrpcQuery } from "../../../shared/hooks/useTrpcQuery";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface RedemptionRecord {
  id: string;
  orderId: string;
  orderNo: string;
  userId: string;
  templateId: string;
  merchantId: string;
  price: number;
  faceValue: number;
  redeemedAt: Date;
  user?: {
    id: string;
    nickname?: string;
    email: string;
  };
  template?: {
    id: string;
    title: string;
    settlementAmount?: number;
  };
  merchant?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export const RedemptionRecordsPage = () => {
  const [merchantFilter, setMerchantFilter] = useState<string | undefined>(undefined);
  const [templateFilter, setTemplateFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<RedemptionRecord>({
    resource: "redemption",
    pagination: {
      pageSize: 20,
    },
  });

  // 当筛选条件变化时，更新 filters
  const handleFilterChange = () => {
    const filters: any[] = [];

    if (merchantFilter) {
      filters.push({ field: "redeemMerchantId", operator: "eq", value: merchantFilter });
    }

    if (templateFilter) {
      filters.push({ field: "templateId", operator: "eq", value: templateFilter });
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.push({ field: "redeemedAt", operator: "gte", value: dateRange[0].startOf('day').toISOString() });
      filters.push({ field: "redeemedAt", operator: "lte", value: dateRange[1].endOf('day').toISOString() });
    }

    // 使用 "replace" 模式确保空数组也会触发请求
    setFilters(filters, "replace");
  };

  // 监听筛选条件变化
  React.useEffect(() => {
    handleFilterChange();
  }, [merchantFilter, templateFilter, dateRange]);

  const result = tableQuery.data;
  const query = tableQuery;
  const records = (result as any)?.data || [];

  // 统计数据（跟随筛选条件，聚合所有页）
  const { data: stats } = useTrpcQuery<any>(
    "redemption.getStats",
    {
      merchantId: merchantFilter || undefined,
      templateId: templateFilter || undefined,
      dateFrom: dateRange?.[0]?.startOf('day').toISOString(),
      dateTo: dateRange?.[1]?.endOf('day').toISOString(),
    },
  );
  const redeemCount = stats?.count || 0;
  const totalAmount = stats?.totalPrice || 0;
  const totalFaceValue = stats?.totalFaceValue || 0;
  const totalSettlementAmount = stats?.totalSettlement || 0;
  const merchantCount = stats?.merchantCount || 0;

  // 获取商户列表用于筛选（加载全部商户以支持搜索）
  const { result: merchantsResult } = useList({
    resource: "merchant",
    pagination: { pageSize: 1000 }, // 加载更多商户以支持完整搜索
  });

  const merchants = (merchantsResult as any)?.data || [];

  // 获取优惠券模板列表用于筛选
  const { result: templatesResult } = useList({
    resource: "couponTemplate",
    pagination: { pageSize: 1000 },
  });

  const templates = (templatesResult as any)?.data || [];

  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 180,
      render: (orderNo: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{orderNo}</span>
      ),
    },
    {
      title: "用户",
      width: 120,
      render: (_: any, record: RedemptionRecord) => (
        <Space>
          <UserOutlined />
          <span>{record.user?.nickname || record.user?.email || '-'}</span>
        </Space>
      ),
    },
    {
      title: "券标题",
      width: 200,
      render: (_: any, record: RedemptionRecord) => (
        <span style={{ fontWeight: 500 }}>{record.template?.title || '-'}</span>
      ),
    },
    {
      title: "购买价",
      dataIndex: "price",
      width: 100,
      render: (price: any) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatCurrency(price)}</span>
      ),
    },
    {
      title: "面值",
      dataIndex: "faceValue",
      width: 100,
      render: (value: any) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      title: "结算额",
      width: 100,
      render: (_: any, record: RedemptionRecord) => {
        const settlement = record.template?.settlementAmount
          ? toNumber(record.template.settlementAmount)
          : toNumber(record.faceValue);
        return (
          <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(settlement)}</span>
        );
      },
    },
    {
      title: "核销商户",
      width: 150,
      render: (_: any, record: RedemptionRecord) => (
        <Space>
          <ShopOutlined />
          <span>{record.merchant?.name || '-'}</span>
        </Space>
      ),
    },
    {
      title: "商户分类",
      width: 100,
      render: (_: any, record: RedemptionRecord) => (
        <Tag color="blue">{record.merchant?.category?.name || '-'}</Tag>
      ),
    },
    {
      title: "核销时间",
      dataIndex: "redeemedAt",
      width: 160,
      render: (date: Date) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px" }}>
      <List>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>核销记录</h1>
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="核销订单数"
                  value={redeemCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="核销总额"
                  value={totalAmount}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="总面值"
                  value={totalFaceValue}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="结算总额"
                  value={totalSettlementAmount}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="涉及商户数"
                  value={merchantCount}
                  prefix={<ShopOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="筛选优惠券"
              value={templateFilter}
              onChange={setTemplateFilter}
              style={{ width: 240 }}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {templates.map((t: any) => (
                <Select.Option key={t.id} value={t.id} label={t.title}>
                  {t.title}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="筛选商户"
              value={merchantFilter}
              onChange={setMerchantFilter}
              style={{ width: 200 }}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {merchants.map((m: any) => (
                <Select.Option key={m.id} value={m.id} label={m.name}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>
            <RangePicker
              placeholder={['核销开始日期', '核销结束日期']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: 280 }}
            />
          </Space>

          <Table
            columns={columns}
            rowKey="id"
            dataSource={records}
            loading={query.isLoading}
            scroll={{ x: 1300 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: (result as any)?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              },
            }}
          />
        </Card>
      </List>
    </div>
  );
};