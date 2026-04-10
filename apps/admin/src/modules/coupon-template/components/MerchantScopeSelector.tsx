// apps/admin/src/modules/coupon-template/components/MerchantScopeSelector.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Select, Tag } from "antd";
import { useList } from "@refinedev/core";

interface Merchant {
  id: string;
  name: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  status: string;
}

interface MerchantScopeSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean; // 新增：支持禁用状态
}

export const MerchantScopeSelector: React.FC<MerchantScopeSelectorProps> = ({ value, onChange, disabled }) => {
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
    meta: {
      include: {
        category: true, // 包含商户类别信息
      },
    },
  });

  const merchants = (result as any)?.data || [];

  const options = merchants.map((merchant: any) => ({
    label: `${merchant.name} (${merchant.category?.name || '未分类'})`,
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
      placeholder={disabled ? "已根据商户类别自动填充" : "请选择适用商户"}
      loading={isLoading}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      options={options}
      maxTagCount="responsive"
      disabled={disabled} // 添加禁用状态
      tagRender={(props) => {
        const { label, value: tagValue, closable, onClose } = props;
        const merchant = merchants.find((m: any) => m.id === tagValue);
        const categoryName = merchant?.category?.name || '未分类';
        return (
          <Tag
            closable={!disabled && closable} // 禁用时不可删除
            onClose={onClose}
            style={{ marginRight: 3 }}
            color={categoryName === '餐饮' ? 'orange' : 'blue'}
          >
            {label}
          </Tag>
        );
      }}
    />
  );
};