-- 插入商户假数据
INSERT INTO merchants (id, name, "categoryId", area, floor, phone, description, status, "createdAt", "updatedAt")
VALUES
  ('cm1', '海底捞火锅', 'cat_restaurant', 'A区', '3F', '021-12345678', '知名火锅连锁品牌，提供优质服务', 'ACTIVE', NOW(), NOW()),
  ('cm2', '星巴克咖啡', 'cat_restaurant', 'A区', '1F', '021-23456789', '全球知名咖啡品牌', 'ACTIVE', NOW(), NOW()),
  ('cm3', '优衣库', 'cat_retail', 'B区', '2F', '021-34567890', '日本知名服装品牌', 'ACTIVE', NOW(), NOW()),
  ('cm4', '万达影城', 'cat_entertainment', 'C区', '5F', '021-45678901', 'IMAX激光影院', 'ACTIVE', NOW(), NOW()),
  ('cm5', '肯德基', 'cat_restaurant', 'B区', '1F', '021-56789012', '全球连锁快餐品牌', 'ACTIVE', NOW(), NOW()),
  ('cm6', '耐克', 'cat_retail', 'C区', '3F', '021-67890123', '运动服装品牌', 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 插入券模板假数据
INSERT INTO coupon_templates (id, title, "buyPrice", "faceValue", stock, "merchantScope", "validFrom", "validUntil", description, status, "createdAt", "updatedAt")
VALUES
  ('ct1', '50元代100元火锅券', 50.00, 100.00, 1000, '["cm1"]', NOW(), NOW() + INTERVAL '1 month', '适用于海底捞火锅全场消费，每人每次限用2张', 'ACTIVE', NOW(), NOW()),
  ('ct2', '星巴克30元饮品券', 25.00, 30.00, 500, '["cm2"]', NOW(), NOW() + INTERVAL '1 year', '适用于星巴克全场饮品，不限时段', 'ACTIVE', NOW(), NOW()),
  ('ct3', '9.9元观影特惠券', 9.90, 50.00, 2000, '["cm4"]', NOW(), NOW() + INTERVAL '1 month', '万达影城2D/3D通用，节假日可用', 'ACTIVE', NOW(), NOW()),
  ('ct4', '100元美食通用券', 80.00, 100.00, 300, '["cm1", "cm2"]', NOW(), NOW() + INTERVAL '1 month', '适用于所有餐饮类商户', 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 获取用户ID
DO $$
DECLARE
  user_id_1 TEXT;
  user_id_2 TEXT;
BEGIN
  SELECT id INTO user_id_1 FROM users WHERE email = 'user@example.com' LIMIT 1;
  SELECT id INTO user_id_2 FROM users WHERE email = 'user2@example.com' LIMIT 1;

  IF user_id_1 IS NOT NULL THEN
    -- 插入订单假数据
    INSERT INTO orders (id, "orderNo", "userId", "templateId", status, "payId", "paidAt", "redeemMerchantId", "redeemedAt", price, "faceValue", "createdAt", "updatedAt")
    VALUES
      ('co1', '202403260001', user_id_1, 'ct1', 'PAID', 'WX1' || extract(epoch from now())::bigint, NOW() - INTERVAL '1 day', 'cm1', NOW() - INTERVAL '1 hour', 50.00, 100.00, NOW(), NOW()),
      ('co2', '202403260002', user_id_1, 'ct2', 'PAID', 'WX2' || extract(epoch from now())::bigint, NOW() - INTERVAL '2 days', NULL, NULL, 25.00, 30.00, NOW(), NOW()),
      ('co3', '202403260003', user_id_1, 'ct3', 'REDEEMED', 'WX3' || extract(epoch from now())::bigint, NOW() - INTERVAL '3 days', 'cm4', NOW() - INTERVAL '1 day', 9.90, 50.00, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  IF user_id_2 IS NOT NULL THEN
    INSERT INTO orders (id, "orderNo", "userId", "templateId", status, price, "faceValue", "createdAt", "updatedAt")
    VALUES
      ('co4', '202403260004', user_id_2, 'ct1', 'UNPAID', 50.00, 100.00, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    INSERT INTO orders (id, "orderNo", "userId", "templateId", status, "payId", "paidAt", "refundId", "refundReason", "refundedAt", price, "faceValue", "createdAt", "updatedAt")
    VALUES
      ('co5', '202403260005', user_id_2, 'ct4', 'REFUNDED', 'WX5' || extract(epoch from now())::bigint, NOW() - INTERVAL '5 days', 'REFUND' || extract(epoch from now())::bigint, '不想使用了', NOW() - INTERVAL '4 days', 80.00, 100.00, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 插入新闻假数据
INSERT INTO news (id, title, "bannerUrl", content, "linkedCouponId", "viewCount", status, "createdAt", "updatedAt")
VALUES
  ('n1', '春季美食节盛大开幕', 'https://example.com/news1.jpg', '<p>春季美食节活动火热进行中！</p><p>参与商户：海底捞、星巴克、肯德基等</p><p>活动时间：2024年3月1日-3月31日</p>', 'ct4', 1523, 'PUBLISHED', NOW(), NOW()),
  ('n2', '新商户入驻：耐克旗舰店', 'https://example.com/news2.jpg', '<p>欢迎耐克旗舰店盛大开业！</p><p>开业期间全场8折优惠</p><p>地址：商场3F</p>', NULL, 856, 'PUBLISHED', NOW(), NOW()),
  ('n3', '五一劳动节促销活动预告', 'https://example.com/news3.jpg', '<p>五一劳动节即将到来，更多精彩活动敬请期待！</p>', NULL, 342, 'DRAFT', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 插入结算单假数据
INSERT INTO settlements (id, "merchantId", period, "totalAmount", "orderCount", status, "snapshotData", "confirmedAt", "confirmedBy", "paidAt", "createdAt", "updatedAt")
VALUES
  ('s1', 'cm1', '2024-02', 15000.00, 300, 'PAID', '{}', NOW() - INTERVAL '20 days', 'superadmin@example.com', NOW() - INTERVAL '15 days', NOW(), NOW()),
  ('s2', 'cm2', '2024-02', 8500.00, 340, 'PAID', '{}', NOW() - INTERVAL '20 days', 'admin@example.com', NOW() - INTERVAL '15 days', NOW(), NOW()),
  ('s3', 'cm4', '2024-02', 22000.00, 2200, 'CONFIRMED', '{}', NOW() - INTERVAL '20 days', 'superadmin@example.com', NULL, NOW(), NOW()),
  ('s4', 'cm1', '2024-03', 18000.00, 360, 'PENDING', '{}', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;
