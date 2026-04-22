// apps/admin/src/modules/coupon-template/components/MerchantScopeSelector.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Select, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";

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

  // 商户信息缓存：存储已选择商户的完整信息
  const [merchantCache, setMerchantCache] = useState<Map<string, Merchant>>(new Map());

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

  // 使用 useQuery 直接调用 tRPC，一次性获取所有商户（绕过 Refine 分页）
  const { data, isLoading } = useQuery({
    queryKey: ["merchants", "all", debouncedSearch],
    queryFn: async () => {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.merchant.getMany.query({
        page: 1,
        limit: 1000, // 获取所有商户
        where: {
          status: "ACTIVE",
          ...(debouncedSearch ? { name: { contains: debouncedSearch } } : {}),
        },
        include: {
          category: true,
        },
      });
      return result.items || [];
    },
  });

  const merchants = data || [];

  // 更新商户缓存：将新加载的商户信息添加到缓存中
  useEffect(() => {
    if (merchants.length > 0) {
      const newCache = new Map(merchantCache);
      merchants.forEach((merchant: Merchant) => {
        newCache.set(merchant.id, merchant);
      });
      setMerchantCache(newCache);
    }
  }, [merchants]);

  // 当 value 变化时，加载缺失商户的完整信息
  useEffect(() => {
    if (value && value.length > 0) {
      const missingIds = value.filter(id => !merchantCache.has(id));
      if (missingIds.length > 0) {
        // 加载缺失的商户信息
        (async () => {
          const trpcClient = await getTrpcClient();
          const result = await trpcClient.merchant.getMany.query({
            page: 1,
            limit: 1000,
            where: {
              id: { in: missingIds },
            },
            include: {
              category: true,
            },
          });
          const newCache = new Map(merchantCache);
          result.items?.forEach((merchant: Merchant) => {
            newCache.set(merchant.id, merchant);
          });
          setMerchantCache(newCache);
        })();
      }
    }
  }, [value]);

  // 使用 useMemo 确保 options 正确计算，包含已选择的商户
  const options = useMemo(() => {
    const baseOptions = merchants.map((merchant: Merchant) => ({
      label: `${merchant.name} (${merchant.category?.name || '未分类'})`,
      value: merchant.id,
    }));

    // 添加已选择的商户（如果不在当前加载的列表中）
    const selectedMerchants = value || [];
    const fallbackOptions = selectedMerchants
      .filter((merchantId) => !baseOptions.find((opt) => opt.value === merchantId))
      .map((merchantId) => {
        // 从缓存中获取商户信息
        const cachedMerchant = merchantCache.get(merchantId);
        return {
          label: cachedMerchant
            ? `${cachedMerchant.name} (${cachedMerchant.category?.name || '未分类'})`
            : `商户 ID: ${merchantId}`,
          value: merchantId,
        };
      });

    return [...baseOptions, ...fallbackOptions];
  }, [merchants, value, merchantCache]);

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
        // 优先从缓存中查找商户信息，然后再从当前列表中查找
        const merchant = merchantCache.get(tagValue as string) || merchants.find((m: Merchant) => m.id === tagValue);
        const categoryName = merchant?.category?.name || '未分类';

        // 如果商户不在缓存和当前列表中，显示灰色标签
        if (!merchant) {
          return (
            <Tag
              closable={!disabled && closable}
              onClose={onClose}
              style={{ marginRight: 3 }}
              color="default"
            >
              {label}
            </Tag>
          );
        }

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