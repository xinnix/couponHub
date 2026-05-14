import { Form, DatePicker, Alert } from "antd";
import dayjs from "dayjs";
import { MerchantSelector } from "../../../shared/components";

interface SettlementFormProps {
  form: any;
}

export const SettlementForm: React.FC<SettlementFormProps> = ({ form }) => {
  return (
    <Form form={form} layout="vertical">
      <Alert
        message="注意事项"
        description="生成结算单将锁定该商户在指定期间内已核销的订单，锁定后订单不能退款。结算单生成后可在详情页查看订单明细。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item
        name="merchantId"
        label="选择商户"
        rules={[{ required: true, message: "请选择商户" }]}
      >
        <MerchantSelector placeholder="请选择商户" />
      </Form.Item>

      <Form.Item
        name="period"
        label="结算期间"
        rules={[{ required: true, message: "请选择结算期间" }]}
        extra="选择月份，将统计该月内已核销的订单"
      >
        <DatePicker
          picker="month"
          placeholder="请选择月份"
          style={{ width: "100%" }}
          format="YYYY-MM"
          disabledDate={(current) => current && current > dayjs().endOf("month")}
        />
      </Form.Item>
    </Form>
  );
};
