import { Form, Input, Switch } from "antd";

interface AdminFormProps {
  form: any;
  isEdit: boolean;
}

export const AdminForm: React.FC<AdminFormProps> = ({ form, isEdit }) => {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入有效的邮箱地址" },
        ]}
      >
        <Input placeholder="请输入邮箱" />
      </Form.Item>

      {!isEdit && (
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: "请输入密码" },
            { min: 8, message: "密码至少 8 个字符" },
          ]}
        >
          <Input.Password placeholder="请输入密码（至少 8 个字符）" />
        </Form.Item>
      )}

      <Form.Item name="firstName" label="名">
        <Input placeholder="请输入名" />
      </Form.Item>

      <Form.Item name="lastName" label="姓">
        <Input placeholder="请输入姓" />
      </Form.Item>

      <Form.Item name="isActive" label="启用状态" valuePropName="checked" initialValue={true}>
        <Switch checkedChildren="启用" unCheckedChildren="停用" />
      </Form.Item>
    </Form>
  );
};
