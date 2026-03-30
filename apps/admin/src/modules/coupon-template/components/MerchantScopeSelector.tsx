// apps/admin/src/modules/coupon-template/components/MerchantScopeSelector.tsx
import { useState, useEffect } from "react";
import { Select, Spin, Tag } from "antd";
import { useList } from "@refinedev/core";

interface Merchant {
  id: string;
  name: string;
  category: string;
  status: string;
}

interface MerchantScopeSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export const MerchantScopeSelector: React.FC<MerchantScopeSelectorProps> = ({ value, onChange }) => {
  const [searchText, setSearchText] = useState("");

  const { result, isLoading } = useList<Merchant>({
    resource: "merchant",
    pagination: {
      pageSize: 100, // 加载足够多的商户
    },
    filters: [
      { field: "status", operator: "eq", value: "ACTIVE" },
      ...(searchText ? [{ field: "search", operator: "contains", value: searchText }] as any : []),
    ],
  });

  const merchants = (result as any)?.data || [];

  const options = merchants.map((merchant: Merchant) => ({
    label: `${merchant.name} (${merchant.category})`,
    value: merchant.id,
  }));

  return (
    <Select
      mode="multiple"
      style={{ width: '100%' }}
      value={value}
      onChange={onChange}
      placeholder="请选择适用商户"
      loading={isLoading}
      showSearch
      filterOption={false}
      onSearch={setSearchText}
      options={options}
      maxTagCount="responsive"
      tagRender={(props) => {
        const { label, value: tagValue, closable, onClose } = props;
        const merchant = merchants.find((m: Merchant) => m.id === tagValue);
        return (
          <Tag
            closable={closable}
            onClose={onClose}
            style={{ marginRight: 3 }}
            color={merchant?.category === '餐饮' ? 'orange' : 'blue'}
          >
            {label}
          </Tag>
        );
      }}
    />
  );
};