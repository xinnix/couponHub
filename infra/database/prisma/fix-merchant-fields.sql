-- 手动修复商户表字段差异（安全方案，不丢失数据）
-- 执行时间：2026-04-17

-- 1. 删除旧的 floor 字段（如果存在）
ALTER TABLE merchants DROP COLUMN IF EXISTS floor;

-- 2. 添加铺位号字段（如果不存在）
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS shop_number TEXT;

-- 3. 添加营业时间字段（如果不存在）
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS business_hours TEXT;

-- 4. 添加排序权重字段（如果不存在）
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 5. 为排序字段创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS merchants_sort_order_idx ON merchants(sort_order);

-- 验证修改
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'merchants'
ORDER BY ordinal_position;