// apps/admin/src/modules/coupon-template/components/MerchantScopeSelector.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Select, Tag } from "antd";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const { result, isLoading } = useList<Merchant>({
    resource: "merchant",
    pagination: {
      pageSize: 100,
    },
    filters: [
      { field: "status", operator: "eq", value: "ACTIVE" },
      ...(debouncedSearch ? [{ field: "name", operator: "contains", value: debouncedSearch }] as any : []),
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
      onChange={(val) => {
        handleSearch("");
        onChange?.(val);
      }}
      placeholder="请选择适用商户"
      loading={isLoading}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
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