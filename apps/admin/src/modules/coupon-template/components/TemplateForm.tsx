// apps/admin/src/modules/coupon-template/components/TemplateForm.tsx
import { useList } from "@refinedev/core";
import { Form, Input, InputNumber, Select, DatePicker, Row, Col, Tooltip, Checkbox, Alert } from "antd";
import { QuestionCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { MerchantScopeSelector } from './MerchantScopeSelector';
import { CouponRulesForm } from './CouponRulesForm';
import { useEffect, useRef } from 'react';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface TemplateFormProps {
  form: any;
  isEdit: boolean;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ form, isEdit }) => {
  // 使用 ref 存储稳定的 form 引用，避免循环依赖警告
  const formRef = useRef(form);
  formRef.current = form;
  // 获取商户类别列表
  const { result: categoriesResult } = useList({
    resource: "merchantCategory",
    pagination: { pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
  });

  const categories = categoriesResult?.data || [];

  // 监听 categoryId 变化
  const categoryId = Form.useWatch('categoryId', form);

  // 获取该类别下的所有商户
  const { result: categoryMerchantsResult } = useList({
    resource: "merchant",
    pagination: { pageSize: 1000 },
    filters: [
      { field: "status", operator: "eq", value: "ACTIVE" },
      ...(categoryId ? [{ field: "categoryId", operator: "eq", value: categoryId }] as any : []),
    ],
    meta: {
      include: {
        category: true,
      },
    },
  });

  const categoryMerchants = categoryMerchantsResult?.data || [];

  // 监听 categoryId 变化，只在用户选择/修改类别时才自动填充 merchantScope
  useEffect(() => {
    // 核心逻辑：只在有 categoryId 时才自动填充
    // 没有 categoryId 时，不做任何操作（保留原始值或让用户手动选择）
    if (categoryId && categoryMerchants.length > 0) {
      const merchantIds = categoryMerchants.map((m: any) => m.id);
      formRef.current.setFieldValue('merchantScope', merchantIds);
    }
    // 注意：不处理 categoryId 为空的情况，避免覆盖编辑模式下的原始值
    // 使用 merchantIds 而非整个数组，避免循环引用警告
  }, [categoryId, categoryMerchants?.length]);

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
          {/* 相对有效天数（可选） */}
          <Form.Item
            name="validDays"
            label={
              <span>
                有效天数（可选）&nbsp;
                <Tooltip title="购买后X天内有效。如果不填写，则使用固定的使用截止时间。填写后，过期时间取两者最小值">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            rules={[
              { type: 'number', min: 1, message: '有效天数必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              precision={0}
              placeholder="例如：30表示购买后30天内有效"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="status" label="状态" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">上架</Select.Option>
              <Select.Option value="DISABLED">下架</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* 销售期设置 */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.saleFrom !== currentValues.saleFrom || prevValues.saleUntil !== currentValues.saleUntil
        }
      >
        {({ getFieldValue }) => {
          const saleFrom = getFieldValue('saleFrom');
          const saleUntil = getFieldValue('saleUntil');

          return (
            <Form.Item
              label={
                <span>
                  销售期&nbsp;
                  <Tooltip title="设置用户可以购买的时间范围，只能在此时间段内购买">
                    <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </span>
              }
              required
              rules={[
                {
                  validator: () => {
                    if (!saleFrom || !saleUntil) {
                      return Promise.reject(new Error('请选择销售期'));
                    }
                    if (saleUntil.isBefore(saleFrom)) {
                      return Promise.reject(new Error('销售结束时间必须晚于开始时间'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="saleFrom"
                    noStyle
                    rules={[{ required: true, message: "请选择销售开始时间" }]}
                  >
                    <DatePicker
                      placeholder="销售开始时间"
                      style={{ width: '100%' }}
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="saleUntil"
                    noStyle
                    rules={[{ required: true, message: "请选择销售结束时间" }]}
                  >
                    <DatePicker
                      placeholder="销售结束时间"
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

      {/* 使用期设置 */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.useFrom !== currentValues.useFrom || prevValues.useUntil !== currentValues.useUntil
        }
      >
        {({ getFieldValue }) => {
          const useFrom = getFieldValue('useFrom');
          const useUntil = getFieldValue('useUntil');
          const saleUntil = getFieldValue('saleUntil');

          return (
            <>
              <Form.Item
                label={
                  <span>
                    使用期&nbsp;
                    <Tooltip title="设置用户可以核销/使用的时间范围，只能在此时间段内核销">
                      <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </span>
                }
                required
                rules={[
                  {
                    validator: () => {
                      if (!useFrom || !useUntil) {
                        return Promise.reject(new Error('请选择使用期'));
                      }
                      if (useUntil.isBefore(useFrom)) {
                        return Promise.reject(new Error('使用结束时间必须晚于开始时间'));
                      }
                      // 检查使用期是否晚于销售期
                      if (saleUntil && useFrom.isBefore(saleUntil)) {
                        return Promise.reject(new Error('建议使用期开始时间晚于销售期结束时间，否则可能出现用户购买后无法立即使用的情况'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="useFrom"
                      noStyle
                      rules={[{ required: true, message: "请选择使用开始时间" }]}
                    >
                      <DatePicker
                        placeholder="使用开始时间"
                        style={{ width: '100%' }}
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="useUntil"
                      noStyle
                      rules={[{ required: true, message: "请选择使用结束时间" }]}
                    >
                      <DatePicker
                        placeholder="使用结束时间"
                        style={{ width: '100%' }}
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>

              {/* 时间关系提示 */}
              {saleUntil && useFrom && useFrom.isAfter(saleUntil) && (
                <Alert
                  message={`用户购买后需等待 ${Math.ceil((useFrom.toDate().getTime() - saleUntil.toDate().getTime()) / (1000 * 60 * 60 * 24))} 天才能开始使用`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          );
        }}
      </Form.Item>

      {/* 首页展示设置 */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="featuredOnHome"
            label={
              <span>
                展示到首页超值优惠&nbsp;
                <Tooltip title="勾选后，该优惠券将在小程序首页的「热门优惠券」区域展示">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>展示到首页超值优惠列表</Checkbox>
          </Form.Item>
        </Col>
        <Col span={12}>
          {/* 排序权重 */}
          <Form.Item
            name="sortOrder"
            label={
              <span>
                排序权重&nbsp;
                <Tooltip title="数字越大越靠前。用于控制券模板在列表中的显示顺序">
                  <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            initialValue={0}
            rules={[
              { type: 'number', message: '请输入数字' },
            ]}
          >
            <InputNumber
              placeholder="数字越大越靠前"
              style={{ width: '100%' }}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 商户类别选择 */}
      <Form.Item
        name="categoryId"
        label={
          <span>
            商户类别&nbsp;
            <Tooltip title="选择类别后，券模板将自动适用于该类别下的所有商户，商户范围将自动填充">
              <QuestionCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </span>
        }
      >
        <Select
          placeholder="选择商户类别（可选）"
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {categories.map((cat) => (
            <Select.Option key={cat.id} value={cat.id}>
              {cat.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* 当选择了商户类别时，显示提示信息 */}
      {categoryId && (
        <Alert
          message={`已自动填充「${categories.find(c => c.id === categoryId)?.name}」类别下的 ${categoryMerchants.length} 家商户`}
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        name="merchantScope"
        label={
          <span>
            适用商户&nbsp;
            <Tooltip title="选择商户类别后自动填充；未选类别时可手动选择商户">
              <QuestionCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </span>
        }
        extra={categoryId ? "已根据商户类别自动填充，无需手动选择" : "请手动选择适用商户"}
      >
        <MerchantScopeSelector disabled={!!categoryId} />
      </Form.Item>

      <Form.Item name="description" label="券描述">
        <TextArea rows={4} placeholder="请输入券描述" maxLength={500} showCount />
      </Form.Item>

      <CouponRulesForm name="usageRules" />
    </Form>
  );
};