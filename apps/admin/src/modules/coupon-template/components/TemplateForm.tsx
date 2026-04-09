// apps/admin/src/modules/coupon-template/components/TemplateForm.tsx
import { Form, Input, InputNumber, Select, DatePicker, Row, Col, Tooltip } from "antd";
import { QuestionCircleOutlined } from '@ant-design/icons';
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
            label={
              <span>
                购买价格（元）&nbsp;
                <Tooltip title="设置为0元时，用户可直接免费领取，无需支付">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            rules={[
              { required: true, message: "请输入购买价格" },
              { type: 'number', min: 0, message: "价格不能为负数" }, // 修改：允许 0
            ]}
            initialValue={0.01} // 默认值 0.01，避免误设
          >
            <InputNumber
              placeholder="请输入购买价格"
              style={{ width: '100%' }}
              precision={2}
              min={0} // 修改：最小值改为 0
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

      {/* 新增结算金额字段 */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="settlementAmount"
            label={
              <span>
                结算金额（元）&nbsp;
                <Tooltip title="商户结算时的实际金额。不填写则使用面值结算，可低于面值">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            rules={[
              { type: 'number', min: 0, message: "结算金额不能为负数" },
            ]}
          >
            <InputNumber
              placeholder="不填写则使用面值结算"
              style={{ width: '100%' }}
              precision={2}
              min={0}
              prefix="¥"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
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
        <Col span={8}>
          {/* 新增：每人限领数量 */}
          <Form.Item
            name="claimLimit"
            label={
              <span>
                每人限领数量&nbsp;
                <Tooltip title="不填写表示无限制，建议填写以防止恶意刷券">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            initialValue={1} // 默认每人限领 1 张
            rules={[
              { type: 'number', min: 1, message: "限领数量至少为1" },
            ]}
          >
            <InputNumber
              placeholder="不限"
              style={{ width: '100%' }}
              min={1}
              precision={0} // 整数
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="validDays"
            label="有效天数"
            initialValue={30}
            rules={[
              { required: true, message: '请输入有效天数' },
              { type: 'number', min: 1, message: '有效天数必须大于0' },
            ]}
            tooltip="购买后多少天内有效，每个用户根据购买时间独立计算"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              precision={0}
              placeholder="例如：30表示购买后30天内有效"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
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

      <Form.Item name="usageRules" label="使用规则">
        <TextArea
          rows={6}
          placeholder="请输入使用规则说明，例如：满100元可用、周末不可用、每人限用1次等"
          maxLength={1000}
          showCount
        />
      </Form.Item>
    </Form>
  );
};