// apps/admin/src/modules/redemption/components/MerchantSelector.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Select } from "antd";
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

interface MerchantSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const MerchantSelector: React.FC<MerchantSelectorProps> = ({ value, onChange, disabled }) => {
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

  // 使用 useQuery 直接调用 tRPC，一次性获取所有商户
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

  // 更新商户缓存
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
    if (value && !merchantCache.has(value)) {
      (async () => {
        const trpcClient = await getTrpcClient();
        const result = await trpcClient.merchant.getMany.query({
          page: 1,
          limit: 1000,
          where: {
            id: value,
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
  }, [value]);

  // 使用 useMemo 确保 options 正确计算
  const options = useMemo(() => {
    const baseOptions = merchants.map((merchant: Merchant) => ({
      label: `${merchant.name} (${merchant.category?.name || '未分类'})`,
      value: merchant.id,
    }));

    // 添加已选择的商户（如果不在当前加载的列表中）
    if (value && !baseOptions.find((opt) => opt.value === value)) {
      const cachedMerchant = merchantCache.get(value);
      const fallbackOption = {
        label: cachedMerchant
          ? `${cachedMerchant.name} (${cachedMerchant.category?.name || '未分类'})`
          : `商户 ID: ${value}`,
        value: value,
      };
      return [...baseOptions, fallbackOption];
    }

    return baseOptions;
  }, [merchants, value, merchantCache]);

  return (
    <Select
      style={{ width: '100%' }}
      value={value}
      onChange={(val) => {
        handleSearch("");
        onChange?.(val as string);
      }}
      placeholder="请选择核销门店"
      loading={isLoading}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      options={options}
      disabled={disabled}
    />
  );
};