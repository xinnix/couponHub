// apps/admin/src/modules/redemption/components/HandlerSelector.tsx
import { useState, useEffect, useMemo } from "react";
import { Select, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getTrpcClient } from "../../../shared/trpc/trpcClient";

interface Handler {
  id: string;
  name: string;
  phone: string;
  merchantId: string;
  isActive: boolean;
}

interface HandlerSelectorProps {
  merchantId?: string; // 商户 ID，用于动态加载核销员
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const HandlerSelector: React.FC<HandlerSelectorProps> = ({
  merchantId,
  value,
  onChange,
  disabled,
}) => {
  const [handlerCache, setHandlerCache] = useState<Map<string, Handler>>(new Map());

  // 根据商户 ID 加载核销员列表
  const { data, isLoading } = useQuery({
    queryKey: ["handlers", "byMerchant", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];

      const trpcClient = await getTrpcClient();
      const result = await trpcClient.handler.getByMerchant.query({
        merchantId,
      });

      // 只返回活跃的核销员
      return (result || []).filter((handler: Handler) => handler.isActive);
    },
    enabled: !!merchantId, // 只有当 merchantId 存在时才执行查询
  });

  const handlers = data || [];

  // 更新核销员缓存
  useEffect(() => {
    if (handlers.length > 0) {
      const newCache = new Map(handlerCache);
      handlers.forEach((handler: Handler) => {
        newCache.set(handler.id, handler);
      });
      setHandlerCache(newCache);
    }
  }, [handlers]);

  // 当 value 变化时，加载缺失核销员的信息
  useEffect(() => {
    if (value && !handlerCache.has(value) && merchantId) {
      (async () => {
        const trpcClient = await getTrpcClient();
        const result = await trpcClient.handler.getByMerchant.query({
          merchantId,
        });

        const newCache = new Map(handlerCache);
        result?.forEach((handler: Handler) => {
          newCache.set(handler.id, handler);
        });
        setHandlerCache(newCache);
      })();
    }
  }, [value, merchantId]);

  // 使用 useMemo 确保 options 正确计算
  const options = useMemo(() => {
    const baseOptions = handlers.map((handler: Handler) => ({
      label: `${handler.name} (${handler.phone})`,
      value: handler.id,
    }));

    // 添加已选择的核销员（如果不在当前加载的列表中）
    if (value && !baseOptions.find((opt) => opt.value === value)) {
      const cachedHandler = handlerCache.get(value);
      const fallbackOption = {
        label: cachedHandler
          ? `${cachedHandler.name} (${cachedHandler.phone})`
          : `核销员 ID: ${value}`,
        value: value,
      };
      return [...baseOptions, fallbackOption];
    }

    return baseOptions;
  }, [handlers, value, handlerCache]);

  // 当商户变化时，清空核销员选择
  useEffect(() => {
    if (value && merchantId) {
      const selectedHandler = handlerCache.get(value);
      if (selectedHandler && selectedHandler.merchantId !== merchantId) {
        onChange?.(undefined as any); // 清空选择
      }
    }
  }, [merchantId, value, handlerCache]);

  return (
    <Select
      style={{ width: '100%' }}
      value={value}
      onChange={(val) => onChange?.(val as string)}
      placeholder={merchantId ? "请选择核销员" : "请先选择核销门店"}
      loading={isLoading}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={options}
      disabled={disabled || !merchantId}
      notFoundContent={
        merchantId && !isLoading && handlers.length === 0
          ? "该商户暂无活跃核销员"
          : "请先选择核销门店"
      }
    />
  );
};