import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Switch, Button, App } from "antd";
import { trpcClient } from "../../../shared/dataProvider";

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

  const createMutation = useMutation({
    mutationFn: (data: any) => (trpcClient as any).handler.create.mutate(data),
    onSuccess: () => {
      message.success("创建成功");
      queryClient.invalidateQueries({ queryKey: ["handler"] });
      onSuccess();
    },
    onError: (error: any) => {
      message.error(error.message || "创建失败");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      (trpcClient as any).handler.update.mutate({ id, data }),
    onSuccess: () => {
      message.success("更新成功");
      queryClient.invalidateQueries({ queryKey: ["handler"] });
      onSuccess();
    },
    onError: (error: any) => {
      message.error(error.message || "更新失败");
    },
  });

  const onFinish = (values: any) => {
    const data = {
      ...values,
      merchantId,
    };

    if (handler) {
      updateMutation.mutate({ id: handler.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={handler || { isActive: true }}
      onFinish={onFinish}
    >
      <Form.Item
        label="姓名"
        name="name"
        rules={[{ required: true, message: "请输入核销员姓名" }]}
      >
        <Input placeholder="请输入姓名" />
      </Form.Item>

      <Form.Item
        label="手机号"
        name="phone"
        rules={[
          { required: true, message: "请输入手机号" },
          { pattern: /^1[3-9]\d{9}$/, message: "手机号格式不正确" },
        ]}
      >
        <Input placeholder="请输入11位手机号" maxLength={11} />
      </Form.Item>

      <Form.Item
        label="状态"
        name="isActive"
        valuePropName="checked"
      >
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isLoading || updateMutation.isLoading}
          block
        >
          {handler ? "更新" : "创建"}
        </Button>
      </Form.Item>
    </Form>
  );
};
