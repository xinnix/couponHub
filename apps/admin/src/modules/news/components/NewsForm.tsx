// apps/admin/src/modules/news/components/NewsForm.tsx
import { Form, Input, Select, Switch, Alert } from "antd";
import { useList } from "@refinedev/core";
import { RichTextEditor } from "../../../shared/components/RichTextEditor";
import { OSSUpload } from "../../../shared/components/OSSUpload";

interface NewsFormProps {
  form: any;
  isEdit: boolean;
}

export const NewsForm: React.FC<NewsFormProps> = ({ form, isEdit }) => {
  const { result: templatesResult } = useList({
    resource: "couponTemplate",
    pagination: { pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
  });

  const templates = (templatesResult as any)?.data || [];

  // 监听 isPopup 和 status 字段的变化
  const isPopup = Form.useWatch('isPopup', form);
  const status = Form.useWatch('status', form);

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="title"
        label="新闻标题"
        rules={[{ required: true, message: "请输入新闻标题" }]}
      >
        <Input placeholder="请输入新闻标题" maxLength={200} showCount />
      </Form.Item>

      <Form.Item name="bannerUrl" label="Banner图片">
        <OSSUpload type="news_banner" />
      </Form.Item>

      <Form.Item
        name="content"
        label="新闻内容"
        rules={[{ required: true, message: "请输入新闻内容" }]}
      >
        <RichTextEditor placeholder="请输入新闻内容..." />
      </Form.Item>

      <Form.Item name="linkedCouponId" label="关联券模板" extra="关联后，小程序端将显示'立即购买'按钮">
        <Select
          placeholder="选择关联的券模板（可选）"
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {templates.map((t: any) => (
            <Select.Option key={t.id} value={t.id}>
              {t.title} - ¥{t.buyPrice}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* 新增：弹窗新闻开关 */}
      <Form.Item
        name="isPopup"
        label="首页弹窗"
        valuePropName="checked"
        extra={
          <div>
            <p>开启后将在小程序首页以弹窗形式展示（页面加载时弹出一次）</p>
            {isPopup && status === 'PUBLISHED' && (
              <Alert
                message="提示：只能设置一个弹窗新闻"
                description="如果已存在其他发布状态的弹窗新闻，系统将自动取消其弹窗设置"
                type="info"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        }
        initialValue={false}
      >
        <Switch />
      </Form.Item>

      <Form.Item
        name="isHero"
        label="头图文章"
        valuePropName="checked"
        extra="开启后将在小程序顶部 Hero 区域展示，否则在底部区域展示"
        initialValue={false}
      >
        <Switch />
      </Form.Item>

      <Form.Item name="status" label="状态" initialValue="DRAFT">
        <Select>
          <Select.Option value="DRAFT">草稿</Select.Option>
          <Select.Option value="PUBLISHED">发布</Select.Option>
        </Select>
      </Form.Item>
    </Form>
  );
};
