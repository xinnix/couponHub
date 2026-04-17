// apps/admin/src/modules/merchant/pages/MerchantDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useUpdate } from "@refinedev/core";
import { Card, Descriptions, Tag, Button, Tabs, Table, Space, Spin, Empty, App, Modal, Form, Image } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, StopOutlined, EditOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { HandlerList } from "../components/HandlerList";
import { MerchantForm } from "../components/MerchantForm";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";

interface MerchantCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  status: string;
}

interface Merchant {
  id: string;
  name: string;
  logo?: string;
  categoryId: string;
  category?: MerchantCategory;
  area?: string;
  shopNumber?: string;
  sortOrder: number;
  phone?: string;
  businessHours?: string;
  gallery?: string[];
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    handlers: number;
    orders: number;
  };
}

interface MerchantHandler {
  id: string;
  merchantId: string;
  userId: string;
  name: string;
  phone: string;
  isActive: boolean;
  user?: {
    id: string;
    nickname: string;
    phone: string;
  };
}

interface CouponTemplate {
  id: string;
  title: string;
  buyPrice: number;
  faceValue: number;
  stock: number;
  status: string;
  merchantScope: string[];
  saleFrom: Date;
  saleUntil: Date;
  useFrom: Date;
  useUntil: Date;
  createdAt: Date;
}

export const MerchantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [availableCoupons, setAvailableCoupons] = useState<CouponTemplate[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const { result: merchant, isLoading, query } = useOne<Merchant>({
    resource: "merchant",
    id: id!,
  });

  const { mutate: update } = useUpdate();

  // 加载商户可用的优惠券
  useEffect(() => {
    if (id) {
      loadAvailableCoupons(id);
    }
  }, [id]);

  const loadAvailableCoupons = async (merchantId: string) => {
    setLoadingCoupons(true);
    try {
      const trpcClient = getTrpcClient();
      const coupons = await trpcClient.couponTemplate.findByMerchantId.query({ merchantId });
      setAvailableCoupons(coupons as CouponTemplate[]);
    } catch (error) {
      console.error('加载优惠券失败:', error);
      message.error('加载优惠券失败');
    } finally {
      setLoadingCoupons(false);
    }
  };

  // 处理状态切换
  const handleToggleStatus = () => {
    if (!merchant) return;

    update(
      {
        resource: "merchant",
        id: merchant.id,
        values: { status: merchant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      },
      {
        onSuccess: () => {
          message.success(merchant.status === 'ACTIVE' ? "商户已停用" : "商户已激活");
          query.refetch();
        },
        onError: () => {
          message.error("操作失败");
        },
      }
    );
  };

  // 处理编辑
  const handleEdit = () => {
    if (!merchant) return;

    form.setFieldsValue({
      ...merchant,
      categoryId: merchant.categoryId,
    });
    setEditModalVisible(true);
  };

  // 处理编辑提交
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();

      update(
        {
          resource: "merchant",
          id: merchant!.id,
          values: values,
        },
        {
          onSuccess: () => {
            message.success("更新成功");
            setEditModalVisible(false);
            query.refetch();
          },
          onError: () => {
            message.error("更新失败");
          },
        }
      );
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!merchant) {
    return <Empty description="商户不存在" />;
  }

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="商户名称">{merchant.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={merchant.status === 'ACTIVE' ? 'success' : 'error'}>
              {merchant.status === 'ACTIVE' ? '激活' : '停用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="商户分类">
            <Tag color="blue">{merchant.category?.name || '未分类'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区域">
            {merchant.area ? <Tag color="geekblue">{merchant.area}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="铺位号">{merchant.shopNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="排序序号">{merchant.sortOrder}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{merchant.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="营业时间">{merchant.businessHours || '-'}</Descriptions.Item>
          <Descriptions.Item label="核销员数量">{merchant._count?.handlers || 0}</Descriptions.Item>
          <Descriptions.Item label="核销订单">{merchant._count?.orders || 0}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(merchant.createdAt).toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(merchant.updatedAt).toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="商户描述" span={2}>
            {merchant.description || '-'}
          </Descriptions.Item>
          {merchant.gallery && merchant.gallery.length > 0 && (
            <Descriptions.Item label="商户轮播图" span={2}>
              <Space size="small" wrap>
                {merchant.gallery.map((url, index) => (
                  <div key={index} style={{ textAlign: 'center' }}>
                    <Image
                      src={url}
                      alt={`轮播图 ${index + 1}`}
                      width={120}
                      height={80}
                      style={{ objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                      {index === 0 ? '封面' : `图${index + 1}`}
                    </div>
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      ),
    },
    {
      key: 'coupons',
      label: `可用优惠券 (${availableCoupons.length})`,
      children: (
        <div style={{ padding: '24px 0' }}>
          <Table
            dataSource={availableCoupons}
            rowKey="id"
            loading={loadingCoupons}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            columns={[
              {
                title: '优惠券标题',
                dataIndex: 'title',
                key: 'title',
                width: 200,
              },
              {
                title: '购买价格',
                dataIndex: 'buyPrice',
                key: 'buyPrice',
                width: 120,
                render: (value: number | string) => `¥${Number(value).toFixed(2)}`,
              },
              {
                title: '面值',
                dataIndex: 'faceValue',
                key: 'faceValue',
                width: 120,
                render: (value: number | string) => `¥${Number(value).toFixed(2)}`,
              },
              {
                title: '库存',
                dataIndex: 'stock',
                key: 'stock',
                width: 80,
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 80,
                render: (status: string) => (
                  <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>
                    {status === 'ACTIVE' ? '可用' : '不可用'}
                  </Tag>
                ),
              },
              {
                title: '销售期',
                key: 'salePeriod',
                width: 200,
                render: (_, record: CouponTemplate) => {
                  const saleFrom = new Date(record.saleFrom).toLocaleDateString('zh-CN');
                  const saleUntil = new Date(record.saleUntil).toLocaleDateString('zh-CN');
                  return `${saleFrom} ~ ${saleUntil}`;
                },
              },
              {
                title: '使用期',
                key: 'usePeriod',
                width: 200,
                render: (_, record: CouponTemplate) => {
                  const useFrom = new Date(record.useFrom).toLocaleDateString('zh-CN');
                  const useUntil = new Date(record.useUntil).toLocaleDateString('zh-CN');
                  return `${useFrom} ~ ${useUntil}`;
                },
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 150,
                render: (date: Date) => new Date(date).toLocaleDateString('zh-CN'),
              },
              {
                title: '操作',
                key: 'action',
                fixed: 'right',
                width: 100,
                render: (_, record: CouponTemplate) => (
                  <Button
                    type="link"
                    onClick={() => navigate(`/coupon-templates/${record.id}`)}
                  >
                    查看
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'handlers',
      label: `核销员管理`,
      children: (
        <HandlerList merchantId={merchant.id} />
      ),
    },
    {
      key: 'orders',
      label: `核销记录 (${merchant._count?.orders || 0})`,
      children: (
        <div style={{ padding: '24px 0' }}>
          <Card>
            <Empty description="核销记录功能待后端API完善" />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/merchants")}>
            返回列表
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑商户
          </Button>
          <Button
            icon={merchant.status === 'ACTIVE' ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={handleToggleStatus}
            danger={merchant.status === 'ACTIVE'}
          >
            {merchant.status === 'ACTIVE' ? '停用商户' : '激活商户'}
          </Button>
        </Space>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          {merchant.logo && (
            <img
              src={merchant.logo}
              alt={merchant.name}
              style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginRight: 16 }}
            />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>{merchant.name}</h1>
            <Space style={{ marginTop: 8 }}>
              <Tag color="blue">{merchant.category?.name || '未分类'}</Tag>
              {merchant.area && <Tag color="geekblue">{merchant.area}</Tag>}
              {merchant.shopNumber && <Tag>{merchant.shopNumber}铺位</Tag>}
              <Tag color={merchant.status === 'ACTIVE' ? 'success' : 'error'}>
                {merchant.status === 'ACTIVE' ? '激活' : '停用'}
              </Tag>
            </Space>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* 编辑商户对话框 */}
      <Modal
        title="编辑商户"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={700}
      >
        <MerchantForm form={form} isEdit={true} />
      </Modal>
    </div>
  );
};