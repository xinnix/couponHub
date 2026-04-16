import { useCreate, useUpdate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { Form, Input, Switch, Button, Space, App } from "antd";

interface Handler {
  id: string;
  name: string;
  phone: string;
  merchantId: string;
  isActive: boolean;
}

interface HandlerFormProps {
  merchantId: string;
  handler?: Handler | null;
  onSuccess: () => void;
}

export const HandlerForm = ({ merchantId, handler, onSuccess }: HandlerFormProps) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { mutate: createHandler, isLoading: isCreating } = useCreate();
  const { mutate: updateHandler, isLoading: isUpdating } = useUpdate();

  const onFinish = (values: any) => {
    const data = {
      ...values,
      merchantId,
    };

    if (handler) {
      updateHandler(
        { resource: "handler", id: handler.id, values: data },
        {
          onSuccess: () => {
            message.success("更新成功");
            queryClient.invalidateQueries({ queryKey: ["handler"] });
            onSuccess();
          },
          onError: (error: any) => {
            message.error(error.message || "更新失败");
          },
        }
      );
    } else {
      createHandler(
        { resource: "handler", values: data },
        {
          onSuccess: () => {
            message.success("创建成功");
            queryClient.invalidateQueries({ queryKey: ["handler"] });
            onSuccess();
          },
          onError: (error: any) => {
            message.error(error.message || "创建失败");
          },
        }
      );
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={handler || { isActive: true }}
      onFinish={onFinish}
      style={{ paddingTop: 8 }}
    >
      <Form.Item
        label="姓名"
        name="name"
        rules={[{ required: true, message: "请输入核销员姓名" }]}
      >
        <Input placeholder="请输入核销员姓名" allowClear />
      </Form.Item>

      <Form.Item
        label="手机号"
        name="phone"
        rules={[
          { required: true, message: "请输入手机号" },
          { pattern: /^1[3-9]\d{9}$/, message: "手机号格式不正确" },
        ]}
        extra="手机号用于小程序用户关联核销员身份"
      >
        <Input
          placeholder="请输入11位手机号"
          maxLength={11}
          allowClear
        />
      </Form.Item>

      <Form.Item
        label="状态"
        name="isActive"
        valuePropName="checked"
        extra="禁用后核销员将无法核销优惠券"
      >
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onSuccess}>
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isCreating || isUpdating}
          >
            {handler ? "更新" : "创建"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
