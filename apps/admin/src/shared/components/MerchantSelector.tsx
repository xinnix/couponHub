import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getTrpcClient } from "../trpc/trpcClient";

const PAGE_SIZE = 20;

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
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  mode?: "multiple";
  /** 透传给 Ant Select 的额外 props（如 tagRender, maxTagCount） */
  selectProps?: Partial<SelectProps>;
}

export const MerchantSelector: React.FC<MerchantSelectorProps> = ({
  value,
  onChange,
  disabled,
  placeholder = "请选择商户",
  style = { width: "100%" },
  mode,
  selectProps,
}) => {
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 下一页页码（用于滚动加载更多）
  const [nextPage, setNextPage] = useState(1);

  // 增量累积的商户列表
  const [accumulatedItems, setAccumulatedItems] = useState<Merchant[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 商户信息缓存
  const [merchantCache, setMerchantCache] = useState<Map<string, Merchant>>(
    new Map()
  );

  const handleSearch = useCallback((text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setNextPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 查询商户列表（单页）
  const { data, isFetching } = useQuery({
    queryKey: ["merchants", "select", debouncedSearch, nextPage],
    queryFn: async () => {
      const trpcClient = await getTrpcClient();
      const result = await trpcClient.merchant.getMany.query({
        page: nextPage,
        limit: PAGE_SIZE,
        where: {
          status: "ACTIVE",
          ...(debouncedSearch
            ? { name: { contains: debouncedSearch } }
            : {}),
        },
        include: { category: true },
      });
      return {
        items: (result.items || []) as Merchant[],
        total: result.total || 0,
      };
    },
  });

  // 增量累积：新页数据追加到已有列表
  useEffect(() => {
    if (!data) return;
    if (nextPage === 1) {
      setAccumulatedItems(data.items);
    } else {
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newItems = data.items.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newItems];
      });
    }
    setTotalCount(data.total);
  }, [data, nextPage]);

  const merchants = accumulatedItems;
  const hasMore = merchants.length < totalCount;
  const isLoading = isFetching && nextPage === 1;

  // 更新商户缓存
  useEffect(() => {
    if (merchants.length > 0) {
      setMerchantCache((prev) => {
        const newCache = new Map(prev);
        let changed = false;
        merchants.forEach((merchant) => {
          if (!newCache.has(merchant.id)) {
            newCache.set(merchant.id, merchant);
            changed = true;
          }
        });
        return changed ? newCache : prev;
      });
    }
  }, [merchants]);

  // 当 value 变化时，加载缺失商户的完整信息
  useEffect(() => {
    const ids = mode === "multiple"
      ? (Array.isArray(value) ? value : [])
      : value && !Array.isArray(value) ? [value] : [];
    const missingIds = ids.filter((id) => id && !merchantCache.has(id));
    if (missingIds.length > 0) {
      (async () => {
        const trpcClient = await getTrpcClient();
        const result = await trpcClient.merchant.getMany.query({
          page: 1,
          limit: 100,
          where: { id: { in: missingIds } },
          include: { category: true },
        });
        if (result.items?.length) {
          setMerchantCache((prev) => {
            const newCache = new Map(prev);
            result.items.forEach((merchant: Merchant) => {
              newCache.set(merchant.id, merchant);
            });
            return newCache;
          });
        }
      })();
    }
  }, [value, mode]);

  // 滚动到底部时加载更多
  const handlePopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollHeight - scrollTop - clientHeight < 50 &&
        hasMore &&
        !isFetching
      ) {
        setNextPage((prev) => prev + 1);
      }
    },
    [hasMore, isFetching]
  );

  const getLabel = (merchant: Merchant) =>
    `${merchant.name} (${merchant.category?.name || "未分类"})`;

  const options = useMemo(() => {
    const baseOptions = merchants.map((merchant) => ({
      label: getLabel(merchant),
      value: merchant.id,
    }));

    // 补充已选但不在当前列表中的商户
    const selectedIds = mode === "multiple"
      ? (Array.isArray(value) ? value : [])
      : value && !Array.isArray(value) ? [value] : [];
    const fallbackOptions = selectedIds
      .filter((id) => id && !baseOptions.find((opt) => opt.value === id))
      .map((id) => {
        const cached = merchantCache.get(id);
        return {
          label: cached ? getLabel(cached) : `商户 ID: ${id}`,
          value: id,
        };
      });

    return [...baseOptions, ...fallbackOptions];
  }, [merchants, value, merchantCache, mode]);

  return (
    <Select
      mode={mode}
      style={style}
      value={value}
      onChange={(val) => {
        handleSearch("");
        onChange?.(val);
      }}
      placeholder={placeholder}
      loading={isLoading}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      onPopupScroll={handlePopupScroll}
      options={options}
      disabled={disabled}
      notFoundContent={isLoading ? <Spin size="small" /> : "无匹配商户"}
      maxTagCount={mode === "multiple" ? "responsive" : undefined}
      {...selectProps}
    />
  );
};
