import { Form, Input, Button, Card, Row, Col } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { TextArea } = Input;

interface CouponRulesFormProps {
  name: string; // Form.Item name (e.g., "usageRules")
}

export const CouponRulesForm: React.FC<CouponRulesFormProps> = ({ name }) => {
  return (
    <Form.Item
      noStyle
      shouldUpdate={(prevValues, currentValues) => {
        const rules = currentValues[name];
        if (!Array.isArray(rules)) {
          return true;
        }
        return false;
      }}
    >
      {({ getFieldValue, setFieldValue }) => {
        const currentRules = getFieldValue(name);
        if (!Array.isArray(currentRules)) {
          setFieldValue(name, []);
        }

        return (
          <Form.List name={name}>
            {(fields, { add, remove }) => (
              <>
                <Form.Item label="使用规则">
                  <Button
                    type="dashed"
                    onClick={() => add({ title: '', content: '' })}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加规则
                  </Button>
                </Form.Item>

                {fields.map(({ key, name: fieldIndex, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 16 }}
                    extra={
                      fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(fieldIndex)}
                        >
                          删除
                        </Button>
                      )
                    }
                  >
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          {...restField}
                          name={[fieldIndex, 'title']}
                          label="规则标题"
                          rules={[
                            { required: true, message: '请输入规则标题' },
                            { max: 50, message: '标题最多50字' },
                          ]}
                        >
                          <Input placeholder="如：叠加规则、退改政策" maxLength={50} />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item
                          {...restField}
                          name={[fieldIndex, 'content']}
                          label="规则内容"
                          rules={[
                            { required: true, message: '请输入规则内容' },
                            { max: 500, message: '内容最多500字' },
                          ]}
                        >
                          <TextArea
                            placeholder="详细描述规则内容"
                            rows={3}
                            maxLength={500}
                            showCount
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                {fields.length === 0 && (
                  <Form.Item>
                    <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
                      未添加规则，保存后将使用默认规则
                    </div>
                  </Form.Item>
                )}
              </>
            )}
          </Form.List>
        );
      }}
    </Form.Item>
  );
};