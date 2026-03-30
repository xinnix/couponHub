// apps/admin/src/modules/merchant/components/MerchantForm.tsx
import { Form, Input, Select } from "antd";
import { OSSUpload } from "@/shared/components/OSSUpload";

const { TextArea } = Input;

interface MerchantFormProps {
  form: any;
  isEdit: boolean;
}

export const MerchantForm: React.FC<MerchantFormProps> = ({ form, isEdit }) => {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="商户名称"
        rules={[{ required: true, message: "请输入商户名称" }]}
      >
        <Input placeholder="请输入商户名称" />
      </Form.Item>

      <Form.Item name="logo" label="商户Logo">
        <OSSUpload
          type="merchant_logo"
          maxFileSize={5 * 1024 * 1024}
          accept="image/jpeg,image/png,image/webp"
        />
      </Form.Item>

      <Form.Item
        name="category"
        label="商户分类"
        rules={[{ required: true, message: "请选择商户分类" }]}
      >
        <Select placeholder="请选择商户分类">
          <Select.Option value="餐饮">餐饮</Select.Option>
          <Select.Option value="服装">服装</Select.Option>
          <Select.Option value="娱乐">娱乐</Select.Option>
          <Select.Option value="美容">美容</Select.Option>
          <Select.Option value="其他">其他</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="floor" label="楼层">
        <Input placeholder="例如：1F、2F、B1" />
      </Form.Item>

      <Form.Item name="phone" label="联系电话">
        <Input placeholder="请输入联系电话" />
      </Form.Item>

      <Form.Item name="description" label="商户描述">
        <TextArea rows={4} placeholder="请输入商户描述" />
      </Form.Item>

      <Form.Item name="status" label="状态" initialValue="ACTIVE">
        <Select>
          <Select.Option value="ACTIVE">激活</Select.Option>
          <Select.Option value="INACTIVE">停用</Select.Option>
        </Select>
      </Form.Item>
    </Form>
  );
};