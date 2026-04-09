// apps/admin/src/modules/merchant/components/MerchantForm.tsx
import { useList } from "@refinedev/core";
import { Form, Input, Select } from "antd";
import { OSSUpload } from "@/shared/components/OSSUpload";

const { TextArea } = Input;

interface MerchantFormProps {
  form: any;
  isEdit: boolean;
}

export const MerchantForm: React.FC<MerchantFormProps> = ({ form, isEdit }) => {
  // 获取商户类别列表
  const { result: categoriesResult } = useList({
    resource: "merchantCategory",
    pagination: { pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
  });

  const categories = categoriesResult?.data || [];

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
        name="categoryId"
        label="商户类别"
        rules={[{ required: true, message: "请选择商户类别" }]}
      >
        <Select placeholder="请选择商户类别" showSearch filterOption={(input, option) =>
          (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
        }>
          {categories.map((cat) => (
            <Select.Option key={cat.id} value={cat.id}>
              {cat.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="area" label="区域">
        <Select placeholder="请选择区域" allowClear>
          <Select.Option value="A区">A区</Select.Option>
          <Select.Option value="B区">B区</Select.Option>
          <Select.Option value="C区">C区</Select.Option>
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