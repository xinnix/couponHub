// apps/admin/src/modules/redemption/components/ManualRedeemModal.tsx
import React, { useState } from "react";
import { Modal, Form, Input, Button, Card, Alert, Space, Descriptions, message } from "antd";
import { SearchOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";
import { MerchantSelector } from "./MerchantSelector";
import { HandlerSelector } from "./HandlerSelector";
import dayjs from "dayjs";

interface OrderInfo {
  orderId: string;
  orderNo: string;
  status: string;
  title: string;
  faceValue: number;
  price: number;
  userNickname: string;
  userPhone: string;
  expireAt: Date;
  useFrom: Date;
  useUntil: Date;
  merchantScope: string[];
  isRedeemed: boolean;
  redeemedAt: Date | null;
  redeemMerchantId?: string;
  handlerId?: string;
  handlerName?: string;
  merchantName?: string;
}

interface ManualRedeemModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void; // 核销成功后的回调
}

export const ManualRedeemModal: React.FC<ManualRedeemModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [orderNo, setOrderNo] = useState("");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [merchantId, setMerchantId] = useState("");
  const [handlerId, setHandlerId] = useState("");
  const [queryError, setQueryError] = useState("");

  // 查询订单信息
  const { refetch: fetchOrderInfo, isLoading: loadingOrder } = useQuery({
    queryKey: ["order", "getOrderInfoByOrderNo", orderNo],
    queryFn: async () => {
      if (!orderNo) return null;

      const trpcClient = await getTrpcClient();
      const result = await trpcClient.order.getOrderInfoByOrderNo.query({
        orderNo,
      });
      return result as OrderInfo;
    },
    enabled: false, // 手动触发查询
  });

  // 核销订单
  const { mutate: redeemOrder, isLoading: redeeming } = useMutation({
    mutationFn: async () => {
      const trpcClient = await getTrpcClient();
      return await trpcClient.redemption.redeemByOrderNo.mutate({
        orderNo,
        merchantId,
        handlerId,
      });
    },
    onSuccess: () => {
      message.success("核销成功！");
      onSuccess();
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.message || "核销失败，请稍后重试");
    },
  });

  // 查询订单按钮点击
  const handleQueryOrder = async () => {
    if (!orderNo) {
      message.warning("请输入订单号");
      return;
    }

    setQueryError("");
    setOrderInfo(null);

    try {
      const result = await fetchOrderInfo();
      if (result.data) {
        setOrderInfo(result.data);
        // 如果已核销，显示警告
        if (result.data.isRedeemed) {
          setQueryError(`该订单已于 ${dayjs(result.data.redeemedAt).format('YYYY-MM-DD HH:mm:ss')} 核销`);
        }
      } else if (result.error) {
        setQueryError(result.error.message || "查询失败");
      }
    } catch (error: any) {
      setQueryError(error.message || "查询失败");
    }
  };

  // 核销按钮点击
  const handleRedeem = async () => {
    if (!orderInfo) {
      message.warning("请先查询订单信息");
      return;
    }
    if (!merchantId) {
      message.warning("请选择核销门店");
      return;
    }
    if (!handlerId) {
      message.warning("请选择核销员");
      return;
    }

    // 验证商户权限
    if (orderInfo.merchantScope && orderInfo.merchantScope.length > 0) {
      if (!orderInfo.merchantScope.includes(merchantId)) {
        const confirmed = await new Promise((resolve) => {
          Modal.confirm({
            title: "商户权限警告",
            content: "该券不适用于所选商户，是否继续核销？",
            okText: "继续核销",
            cancelText: "取消",
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!confirmed) return;
      }
    }

    redeemOrder();
  };

  // 取消并清空
  const handleCancel = () => {
    setOrderNo("");
    setOrderInfo(null);
    setMerchantId("");
    setHandlerId("");
    setQueryError("");
    onCancel();
  };

  // 判断是否可以核销
  const canRedeem = orderInfo && !orderInfo.isRedeemed && orderInfo.status === 'PAID';

  return (
    <Modal
      title="手动核销"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="redeem"
          type="primary"
          onClick={handleRedeem}
          disabled={!canRedeem || !merchantId || !handlerId}
          loading={redeeming}
        >
          确认核销
        </Button>,
      ]}
    >
      <Form layout="vertical">
        {/* 订单号输入 */}
        <Form.Item label="订单号" required>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="请输入订单号"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              onPressEnter={handleQueryOrder}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleQueryOrder}
              loading={loadingOrder}
            >
              查询
            </Button>
          </Space.Compact>
        </Form.Item>

        {/* 错误提示 */}
        {queryError && (
          <Alert
            message={queryError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 订单信息预览 */}
        {orderInfo && (
          <Card
            title={
              <Space>
                <span>订单信息</span>
                {orderInfo.isRedeemed && (
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                )}
                {orderInfo.status === 'PAID' && !orderInfo.isRedeemed && (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="订单号" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{orderInfo.orderNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="券标题" span={2}>
                <strong>{orderInfo.title}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {orderInfo.userNickname} ({orderInfo.userPhone})
              </Descriptions.Item>
              <Descriptions.Item label="购买价">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  ¥{orderInfo.price.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="面值">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  ¥{orderInfo.faceValue.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {orderInfo.isRedeemed ? (
                  <span style={{ color: '#ff4d4f' }}>已核销</span>
                ) : orderInfo.status === 'PAID' ? (
                  <span style={{ color: '#52c41a' }}>可核销</span>
                ) : (
                  <span style={{ color: '#faad14' }}>{orderInfo.status}</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="使用期限">
                {dayjs(orderInfo.useFrom).format('YYYY-MM-DD')} 至 {dayjs(orderInfo.useUntil).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">
                {orderInfo.expireAt
                  ? dayjs(orderInfo.expireAt).format('YYYY-MM-DD')
                  : '长期有效'}
              </Descriptions.Item>
              {orderInfo.isRedeemed && (
                <>
                  <Descriptions.Item label="核销商户">
                    {orderInfo.merchantName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="核销员">
                    {orderInfo.handlerName || '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            {/* 商户权限提示 */}
            {orderInfo.merchantScope && orderInfo.merchantScope.length > 0 && !orderInfo.isRedeemed && (
              <Alert
                message="适用商户范围"
                description={`该券仅适用于指定的 ${orderInfo.merchantScope.length} 个商户`}
                type="info"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        )}

        {/* 核销门店和核销员选择 */}
        {orderInfo && !orderInfo.isRedeemed && orderInfo.status === 'PAID' && (
          <>
            <Form.Item label="核销门店" required>
              <MerchantSelector
                value={merchantId}
                onChange={setMerchantId}
              />
            </Form.Item>

            <Form.Item label="核销员" required>
              <HandlerSelector
                merchantId={merchantId}
                value={handlerId}
                onChange={setHandlerId}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};