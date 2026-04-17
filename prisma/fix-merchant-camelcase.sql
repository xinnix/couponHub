-- 修复商户表字段（统一使用 camelCase）
-- 执行时间：2026-04-17

-- 1. 删除重复的 snake_case 字段
ALTER TABLE merchants DROP COLUMN IF EXISTS business_hours;
ALTER TABLE merchants DROP COLUMN IF EXISTS sort_order;

-- 2. 确保 camelCase 字段存在
-- businessHours 字段应该已经存在，如果没有则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'businessHours'
  ) THEN
    ALTER TABLE merchants ADD COLUMN businessHours TEXT;
  END IF;
END $$;

-- sortOrder 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'sortOrder'
  ) THEN
    ALTER TABLE merchants ADD COLUMN sortOrder INTEGER DEFAULT 0;
  END IF;
END $$;

-- 3. 创建 sortOrder 索引（如果不存在）
CREATE INDEX IF NOT EXISTS merchants_sortOrder_idx ON merchants(sortOrder);

-- 4. 验证字段列表
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'merchants'
ORDER BY ordinal_position;