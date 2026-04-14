-- ==========================================
-- 商户分类扩充数据
-- ==========================================

-- 确保商户分类存在
INSERT INTO merchant_categories (id, name, slug, description, "sortOrder", status, icon, "createdAt", "updatedAt")
VALUES
  ('cat_restaurant', '餐饮', 'restaurant', '餐饮美食类商户', 1, 'ACTIVE', '🍽️', NOW(), NOW()),
  ('cat_clothing', '服装', 'clothing', '服装鞋帽类商户', 2, 'ACTIVE', '👕', NOW(), NOW()),
  ('cat_entertainment', '娱乐', 'entertainment', '休闲娱乐类商户', 3, 'ACTIVE', '🎮', NOW(), NOW()),
  ('cat_beauty', '美容美发', 'beauty', '美容美发服务类商户', 4, 'ACTIVE', '💇', NOW(), NOW()),
  ('cat_services', '生活服务', 'services', '生活服务类商户', 5, 'ACTIVE', '🛠️', NOW(), NOW()),
  ('cat_retail', '零售', 'retail', '零售百货类商户', 6, 'ACTIVE', '🛍️', NOW(), NOW()),
  ('cat_fitness', '健身运动', 'fitness', '健身运动类商户', 7, 'ACTIVE', '💪', NOW(), NOW()),
  ('cat_education', '教育培训', 'education', '教育培训类商户', 8, 'ACTIVE', '📚', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- ==========================================
-- 商户扩充数据（包含 logo, gallery）
-- ==========================================

-- 删除旧商户数据（可选，如果需要重新插入）
-- DELETE FROM merchants WHERE id LIKE 'cm%';

-- 插入餐饮类商户
INSERT INTO merchants (id, name, logo, "categoryId", area, floor, phone, gallery, description, status, "createdAt", "updatedAt")
VALUES
  -- 餐饮类
  ('cm1', '海底捞火锅', 'https://picsum.photos/seed/haidilao/200/200', 'cat_restaurant', 'A区', '3F', '021-12345678',
   '["https://picsum.photos/seed/haidilao1/400/300", "https://picsum.photos/seed/haidilao2/400/300", "https://picsum.photos/seed/haidilao3/400/300"]'::jsonb,
   '知名火锅连锁品牌，提供优质服务和美味火锅。特色菜品：番茄锅底、毛肚、虾滑', 'ACTIVE', NOW(), NOW()),

  ('cm2', '星巴克咖啡', 'https://picsum.photos/seed/starbucks/200/200', 'cat_restaurant', 'A区', '1F', '021-23456789',
   '["https://picsum.photos/seed/starbucks1/400/300", "https://picsum.photos/seed/starbucks2/400/300"]'::jsonb,
   '全球知名咖啡品牌，提供高品质咖啡饮品。推荐：拿铁、卡布奇诺、星冰乐', 'ACTIVE', NOW(), NOW()),

  ('cm5', '肯德基', 'https://picsum.photos/seed/kfc/200/200', 'cat_restaurant', 'B区', '1F', '021-56789012',
   '["https://picsum.photos/seed/kfc1/400/300", "https://picsum.photos/seed/kfc2/400/300"]'::jsonb,
   '全球连锁快餐品牌。经典菜品：香辣鸡腿堡、薯条、炸鸡', 'ACTIVE', NOW(), NOW()),

  ('cm7', '必胜客', 'https://picsum.photos/seed/pizzahut/200/200', 'cat_restaurant', 'B区', '2F', '021-11112222',
   '["https://picsum.photos/seed/pizzahut1/400/300", "https://picsum.photos/seed/pizzahut2/400/300"]'::jsonb,
   '知名披萨连锁品牌。推荐：超级至尊披萨、芝心披萨', 'ACTIVE', NOW(), NOW()),

  ('cm8', '麦当劳', 'https://picsum.photos/seed/mcdonalds/200/200', 'cat_restaurant', 'C区', '1F', '021-33334444',
   '["https://picsum.photos/seed/mcdonalds1/400/300", "https://picsum.photos/seed/mcdonalds2/400/300"]'::jsonb,
   '全球知名快餐品牌。经典：巨无霸、麦辣鸡腿堡、薯条', 'ACTIVE', NOW(), NOW()),

  ('cm9', '喜茶', 'https://picsum.photos/seed/xicha/200/200', 'cat_restaurant', 'A区', '2F', '021-55556666',
   '["https://picsum.photos/seed/xicha1/400/300", "https://picsum.photos/seed/xicha2/400/300"]'::jsonb,
   '新式茶饮品牌。招牌：芝芝莓莓、多肉葡萄、纯绿研茶', 'ACTIVE', NOW(), NOW()),

  ('cm10', '小南国', 'https://picsum.photos/seed/xiaonanguo/200/200', 'cat_restaurant', 'C区', '4F', '021-77778888',
   '["https://picsum.photos/seed/xiaonanguo1/400/300", "https://picsum.photos/seed/xiaonanguo2/400/300"]'::jsonb,
   '上海本帮菜餐厅。特色：红烧肉、水晶虾仁、蟹粉豆腐', 'ACTIVE', NOW(), NOW()),

  -- 零售类
  ('cm3', '优衣库', 'https://picsum.photos/seed/uniqlo/200/200', 'cat_retail', 'B区', '2F', '021-34567890',
   '["https://picsum.photos/seed/uniqlo1/400/300", "https://picsum.photos/seed/uniqlo2/400/300"]'::jsonb,
   '日本知名休闲服装品牌。特色：基础款T恤、牛仔裤、羽绒服', 'ACTIVE', NOW(), NOW()),

  ('cm6', '耐克', 'https://picsum.photos/seed/nike/200/200', 'cat_retail', 'C区', '3F', '021-67890123',
   '["https://picsum.photos/seed/nike1/400/300", "https://picsum.photos/seed/nike2/400/300", "https://picsum.photos/seed/nike3/400/300"]'::jsonb,
   '运动服装品牌。热门：Air Max、Air Force 1、运动装备', 'ACTIVE', NOW(), NOW()),

  ('cm11', '阿迪达斯', 'https://picsum.photos/seed/adidas/200/200', 'cat_retail', 'C区', '3F', '021-99990000',
   '["https://picsum.photos/seed/adidas1/400/300", "https://picsum.photos/seed/adidas2/400/300"]'::jsonb,
   '德国运动品牌。经典：三叶草、Ultraboost、Stan Smith', 'ACTIVE', NOW(), NOW()),

  ('cm12', 'ZARA', 'https://picsum.photos/seed/zara/200/200', 'cat_retail', 'A区', '2F', '021-11110001',
   '["https://picsum.photos/seed/zara1/400/300", "https://picsum.photos/seed/zara2/400/300"]'::jsonb,
   '西班牙快时尚品牌。风格：时尚潮流、设计感强', 'ACTIVE', NOW(), NOW()),

  -- 娱乐类
  ('cm4', '万达影城', 'https://picsum.photos/seed/wanda/200/200', 'cat_entertainment', 'C区', '5F', '021-45678901',
   '["https://picsum.photos/seed/wanda1/400/300", "https://picsum.photos/seed/wanda2/400/300"]'::jsonb,
   'IMAX激光影院，提供沉浸式观影体验。特色：IMAX厅、VIP厅、4K放映', 'ACTIVE', NOW(), NOW()),

  ('cm13', '电玩城', 'https://picsum.photos/seed/gamecity/200/200', 'cat_entertainment', 'B区', '5F', '021-22220002',
   '["https://picsum.photos/seed/gamecity1/400/300", "https://picsum.photos/seed/gamecity2/400/300"]'::jsonb,
   '大型电玩娱乐中心。设施：街机游戏、VR体验、投篮机', 'ACTIVE', NOW(), NOW()),

  ('cm14', 'KTV量贩', 'https://picsum.photos/seed/ktv/200/200', 'cat_entertainment', 'A区', '6F', '021-33330003',
   '["https://picsum.photos/seed/ktv1/400/300", "https://picsum.photos/seed/ktv2/400/300"]'::jsonb,
   '高品质KTV娱乐场所。特色：豪华包厢、海量曲库、优质音响', 'ACTIVE', NOW(), NOW()),

  -- 美容美发类
  ('cm15', '美容SPA馆', 'https://picsum.photos/seed/spa/200/200', 'cat_beauty', 'A区', '4F', '021-44440004',
   '["https://picsum.photos/seed/spa1/400/300", "https://picsum.photos/seed/spa2/400/300"]'::jsonb,
   '高端美容SPA会所。服务：面部护理、身体SPA、按摩推拿', 'ACTIVE', NOW(), NOW()),

  ('cm16', '造型工作室', 'https://picsum.photos/seed/hairsalon/200/200', 'cat_beauty', 'B区', '3F', '021-55550005',
   '["https://picsum.photos/seed/hairsalon1/400/300", "https://picsum.photos/seed/hairsalon2/400/300"]'::jsonb,
   '时尚造型工作室。服务：剪发、染发、烫发、造型设计', 'ACTIVE', NOW(), NOW()),

  -- 健身运动类
  ('cm17', '健身中心', 'https://picsum.photos/seed/fitness/200/200', 'cat_fitness', 'C区', '6F', '021-66660006',
   '["https://picsum.photos/seed/fitness1/400/300", "https://picsum.photos/seed/fitness2/400/300"]'::jsonb,
   '专业健身中心。设施：器械区、有氧区、瑜伽室、游泳池', 'ACTIVE', NOW(), NOW()),

  ('cm18', '瑜伽馆', 'https://picsum.photos/seed/yoga/200/200', 'cat_fitness', 'B区', '4F', '021-77770007',
   '["https://picsum.photos/seed/yoga1/400/300", "https://picsum.photos/seed/yoga2/400/300"]'::jsonb,
   '专业瑜伽馆。课程：哈达瑜伽、流瑜伽、空中瑜伽、冥想', 'ACTIVE', NOW(), NOW()),

  -- 生活服务类
  ('cm19', '洗衣店', 'https://picsum.photos/seed/laundry/200/200', 'cat_services', 'A区', '1F', '021-88880008',
   '["https://picsum.photos/seed/laundry1/400/300"]'::jsonb,
   '专业洗衣服务。服务：干洗、水洗、熨烫、皮具护理', 'ACTIVE', NOW(), NOW()),

  ('cm20', '照相馆', 'https://picsum.photos/seed/photo/200/200', 'cat_services', 'B区', '2F', '021-99990009',
   '["https://picsum.photos/seed/photo1/400/300", "https://picsum.photos/seed/photo2/400/300"]'::jsonb,
   '专业照相馆。服务：证件照、艺术照、婚纱照、全家福', 'ACTIVE', NOW(), NOW()),

  -- 教育培训类
  ('cm21', '英语培训', 'https://picsum.photos/seed/english/200/200', 'cat_education', 'C区', '7F', '021-10101010',
   '["https://picsum.photos/seed/english1/400/300", "https://picsum.photos/seed/english2/400/300"]'::jsonb,
   '专业英语培训机构。课程：少儿英语、成人英语、商务英语、雅思托福', 'ACTIVE', NOW(), NOW()),

  ('cm22', '舞蹈工作室', 'https://picsum.photos/seed/dance/200/200', 'cat_education', 'A区', '5F', '021-20202020',
   '["https://picsum.photos/seed/dance1/400/300", "https://picsum.photos/seed/dance2/400/300"]'::jsonb,
   '专业舞蹈培训。课程：芭蕾、爵士、街舞、民族舞', 'ACTIVE', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  logo = EXCLUDED.logo,
  gallery = EXCLUDED.gallery,
  description = EXCLUDED.description,
  "categoryId" = EXCLUDED."categoryId";

-- ==========================================
-- 添加停用状态的商户（用于测试）
-- ==========================================

INSERT INTO merchants (id, name, logo, "categoryId", area, floor, phone, description, status, "createdAt", "updatedAt")
VALUES
  ('cm23', '测试停用商户', 'https://picsum.photos/seed/test/200/200', 'cat_restaurant', 'D区', '1F', '021-00000000',
   '这是一个停用状态的商户，用于测试', 'INACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- ==========================================
-- 统计信息
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '商户分类数量: %', (SELECT COUNT(*) FROM merchant_categories);
  RAISE NOTICE '商户总数: %', (SELECT COUNT(*) FROM merchants);
  RAISE NOTICE '激活商户: %', (SELECT COUNT(*) FROM merchants WHERE status = 'ACTIVE');
  RAISE NOTICE '停用商户: %', (SELECT COUNT(*) FROM merchants WHERE status = 'INACTIVE');
END $$;