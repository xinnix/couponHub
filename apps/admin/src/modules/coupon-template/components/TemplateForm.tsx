// apps/admin/src/modules/coupon-template/components/TemplateForm.tsx
import { Form, Input, InputNumber, Select, DatePicker, Row, Col } from "antd";
import { MerchantScopeSelector } from './MerchantScopeSelector';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface TemplateFormProps {
  form: any;
  isEdit: boolean;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ form, isEdit }) => {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="title"
        label="券标题"
        rules={[{ required: true, message: "请输入券标题" }]}
      >
        <Input placeholder="请输入券标题" maxLength={100} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="buyPrice"
            label="购买价格（元）"
            rules={[
              { required: true, message: "请输入购买价格" },
              { type: 'number', min: 0.01, message: "价格必须大于0" },
            ]}
          >
            <InputNumber
              placeholder="请输入购买价格"
              style={{ width: '100%' }}
              precision={2}
              min={0}
              prefix="¥"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="faceValue"
            label="面值（元）"
            rules={[
              { required: true, message: "请输入面值" },
              { type: 'number', min: 0.01, message: "面值必须大于0" },
            ]}
          >
            <InputNumber
              placeholder="请输入面值"
              style={{ width: '100%' }}
              precision={2}
              min={0}
              prefix="¥"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="stock"
            label="库存"
            rules={[
              { required: true, message: "请输入库存" },
              { type: 'number', min: 0, message: "库存不能为负数" },
            ]}
          >
            <InputNumber
              placeholder="请输入库存"
              style={{ width: '100%' }}
              min={0}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="状态" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">上架</Select.Option>
              <Select.Option value="DISABLED">下架</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.validFrom !== currentValues.validFrom || prevValues.validUntil !== currentValues.validUntil}
      >
        {({ getFieldValue }) => {
          const validFrom = getFieldValue('validFrom');
          const validUntil = getFieldValue('validUntil');
          return (
            <Form.Item
              label="有效期"
              required
              rules={[
                {
                  validator: () => {
                    if (!validFrom || !validUntil) {
                      return Promise.reject(new Error('请选择有效期'));
                    }
                    if (validUntil.isBefore(validFrom)) {
                      return Promise.reject(new Error('结束时间必须晚于开始时间'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="validFrom"
                    noStyle
                    rules={[{ required: true, message: "请选择开始时间" }]}
                  >
                    <DatePicker
                      placeholder="开始时间"
                      style={{ width: '100%' }}
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="validUntil"
                    noStyle
                    rules={[{ required: true, message: "请选择结束时间" }]}
                  >
                    <DatePicker
                      placeholder="结束时间"
                      style={{ width: '100%' }}
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>
          );
        }}
      </Form.Item>

      <Form.Item
        name="merchantScope"
        label="适用商户"
        rules={[{ required: true, message: "请选择适用商户" }]}
      >
        <MerchantScopeSelector />
      </Form.Item>

      <Form.Item name="description" label="券描述">
        <TextArea rows={4} placeholder="请输入券描述" maxLength={500} showCount />
      </Form.Item>
    </Form>
  );
};