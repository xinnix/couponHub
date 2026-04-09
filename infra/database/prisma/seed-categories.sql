-- 插入初始商户类别
INSERT INTO merchant_categories (id, name, slug, description, "sortOrder", status, "createdAt", "updatedAt") VALUES
  ('cat_restaurant', '餐饮', 'restaurant', '餐饮美食类商户', 1, 'ACTIVE', NOW(), NOW()),
  ('cat_clothing', '服装', 'clothing', '服装鞋帽类商户', 2, 'ACTIVE', NOW(), NOW()),
  ('cat_entertainment', '娱乐', 'entertainment', '休闲娱乐类商户', 3, 'ACTIVE', NOW(), NOW()),
  ('cat_beauty', '美容美发', 'beauty', '美容美发服务类商户', 4, 'ACTIVE', NOW(), NOW()),
  ('cat_services', '生活服务', 'services', '生活服务类商户', 5, 'ACTIVE', NOW(), NOW()),
  ('cat_retail', '零售', 'retail', '零售百货类商户', 6, 'ACTIVE', NOW(), NOW());