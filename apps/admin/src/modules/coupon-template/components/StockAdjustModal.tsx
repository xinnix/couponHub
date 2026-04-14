// apps/admin/src/modules/coupon-template/components/StockAdjustModal.tsx
import { Modal, Form, InputNumber, Input, App, Space, Typography } from "antd";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";
import dayjs from "dayjs";

interface StockAdjustModalProps {
  visible: boolean;
  template: {
    id: string;
    title: string;
    stock: number;
    status: string;
  } | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const StockAdjustModal = ({
  visible,
  template,
  onCancel,
  onSuccess,
}: StockAdjustModalProps) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // 创建调整库存的 mutation
  const adjustStockMutation = useMutation({
    mutationFn: async (values: { amount: number; reason: string }) => {
      const trpcClient = await getTrpcClient();
      return trpcClient.couponTemplate.adjustStock.mutate({
        templateId: template!.id,
        amount: values.amount,
        reason: values.reason,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  if (!template) return null;

  const handleFinish = async (values: any) => {
    try {
      await adjustStockMutation.mutateAsync(values);

      message.success(`库存调整成功：${values.amount > 0 ? '增加' : '减少'} ${Math.abs(values.amount)} 张`);
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || "库存调整失败");
    }
  };

  return (
    <Modal
      title="调整库存"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={600}
      okText="确认调整"
      cancelText="取消"
      confirmLoading={adjustStockMutation.isPending}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Text type="secondary">券模板：</Typography.Text>
          <Typography.Text strong>{template.title}</Typography.Text>
        </div>

        <div>
          <Typography.Text type="secondary">当前库存：</Typography.Text>
          <Typography.Text strong style={{ fontSize: 20 }}>
            {template.stock}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            张
          </Typography.Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ amount: 0 }}
        >
          <Form.Item
            label="调整数量"
            name="amount"
            rules={[
              { required: true, message: "请输入调整数量" },
              {
                validator: (_, value) => {
                  if (value === 0) {
                    return Promise.reject("调整数量不能为 0");
                  }
                  if (template.stock + value < 0) {
                    return Promise.reject(
                      `调整后库存不能为负数（当前库存 ${template.stock}，调整数量 ${value}）`
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              <Space>
                <Typography.Text type="secondary">
                  正数 = 增加库存（例如：50 表示增加 50 张）
                </Typography.Text>
                <Typography.Text type="secondary">
                  负数 = 减少库存（例如：-10 表示减少 10 张）
                </Typography.Text>
              </Space>
            }
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入调整数量"
              min={-template.stock}
              max={999999}
              step={1}
            />
          </Form.Item>

          <Form.Item
            label="调整原因说明"
            name="reason"
            rules={[
              { required: true, message: "请输入调整原因说明" },
              { min: 1, message: "原因说明至少 1 个字" },
              { max: 200, message: "原因说明最多 200 个字" },
            ]}
            extra={<Typography.Text type="secondary">最多 200 字，将记录在库存变更日志中</Typography.Text>}
          >
            <Input.TextArea
              rows={4}
              placeholder="例如：为五一假期活动补充库存"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};