import { Form, Select, Input, Space } from "antd";

const { TextArea } = Input;

interface CouponRulesFormProps {
  name: string; // Form.Item name (e.g., "usageRules")
}

export const CouponRulesForm: React.FC<CouponRulesFormProps> = ({ name }) => {
  const form = Form.useFormInstance();

  return (
    <>
      {/* 叠加规则 */}
      <Form.Item label="叠加规则" required>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Form.Item
            name={[name, "stacking", "type"]}
            noStyle
            rules={[{ required: true, message: "请选择叠加规则类型" }]}
          >
            <Select
              placeholder="选择叠加规则类型"
              options={[
                {
                  value: "no_stack",
                  label: "不与其他优惠叠加",
                },
                { value: "limited_stack", label: "限制叠加" },
                { value: "free_stack", label: "可自由叠加" },
                { value: "custom", label: "自定义规则" },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues[name]?.stacking?.type !== currentValues[name]?.stacking?.type
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue([name, "stacking", "type"]);
              if (type === "custom") {
                return (
                  <Form.Item name={[name, "stacking", "customText"]} noStyle>
                    <TextArea
                      placeholder="请输入自定义叠加规则说明"
                      rows={2}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Space>
      </Form.Item>

      {/* 退改规则 */}
      <Form.Item label="退改规则" required>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Form.Item
            name={[name, "refund", "type"]}
            noStyle
            rules={[{ required: true, message: "请选择退改规则类型" }]}
          >
            <Select
              placeholder="选择退改规则类型"
              options={[
                { value: "flexible", label: "未核销前随时退款" },
                { value: "limited", label: "限制退款" },
                { value: "no_refund", label: "不可退款" },
                { value: "custom", label: "自定义规则" },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues[name]?.refund?.type !== currentValues[name]?.refund?.type
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue([name, "refund", "type"]);
              if (type === "custom" || type === "limited") {
                return (
                  <Form.Item name={[name, "refund", "customText"]} noStyle>
                    <TextArea
                      placeholder={
                        type === "limited"
                          ? "请输入退改规则详细说明（如：购买后24小时内可退款）"
                          : "请输入退改规则详细说明"
                      }
                      rows={2}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Space>
      </Form.Item>

      {/* 使用规则 */}
      <Form.Item label="使用规则（可选）">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Form.Item name={[name, "usage", "type"]} noStyle>
            <Select
              placeholder="选择使用规则类型（可选）"
              allowClear
              options={[
                { value: "min_amount", label: "最低消费金额" },
                { value: "time_limit", label: "时间限制" },
                { value: "category", label: "商品类别限制" },
                { value: "custom", label: "自定义规则" },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues[name]?.usage?.type !== currentValues[name]?.usage?.type
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue([name, "usage", "type"]);
              if (type === "custom") {
                return (
                  <Form.Item name={[name, "usage", "customText"]} noStyle>
                    <TextArea
                      placeholder="请输入自定义使用规则说明"
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Space>
      </Form.Item>
    </>
  );
};