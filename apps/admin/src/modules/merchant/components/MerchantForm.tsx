// apps/admin/src/modules/merchant/components/MerchantForm.tsx
import { useList } from "@refinedev/core";
import { Form, Input, Select, InputNumber } from "antd";
import { OSSUpload } from "@/shared/components/OSSUpload";
import { OSSUploadMultiple } from "@/shared/components/OSSUploadMultiple";

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
        name="gallery"
        label="商户轮播图"
        tooltip="第一张图片将作为商户详情页的封面图，建议上传高清大图（宽高比 16:9，建议分辨率 1920x1080）"
      >
        <OSSUploadMultiple
          type="merchant_gallery"
          maxFileSize={10 * 1024 * 1024}
          accept="image/jpeg,image/png,image/webp"
          maxCount={5}
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

      <Form.Item name="shopNumber" label="铺位号">
        <Input placeholder="例如：01、02、A1" />
      </Form.Item>

      <Form.Item
        name="sortOrder"
        label="排序序号"
        tooltip="数字越小越靠前，用于控制首页商户展示顺序"
        initialValue={0}
      >
        <InputNumber
          placeholder="请输入排序序号"
          min={0}
          max={9999}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item name="phone" label="联系电话">
        <Input placeholder="请输入联系电话" />
      </Form.Item>

      <Form.Item
        name="businessHours"
        label="营业时间"
        tooltip="格式：HH:MM-HH:MM，例如：10:00-22:00。不填写则默认为 24 小时营业"
        rules={[
          {
            pattern: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])-([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
            message: "请输入正确的时间格式，例如：10:00-22:00"
          }
        ]}
      >
        <Input placeholder="例如：10:00-22:00（不填写代表 24 小时营业）" />
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