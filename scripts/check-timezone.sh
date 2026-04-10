#!/bin/bash
# 快速验证时区修复效果
# 用于测试当前时间是否正确

echo "⏰ 时区验证工具"
echo "======================================"
echo ""

# 获取本地系统时间
echo "📱 本地系统时间："
date
echo ""

# 获取数据库时间
echo "🗄️  数据库当前时间（PostgreSQL）："
docker exec -i postgres psql -U xinnix -d couponHub -c "SELECT NOW() as db_time_utc, NOW() AT TIME ZONE 'Asia/Shanghai' as db_time_beijing;" 2>/dev/null || echo "⚠️  无法连接数据库"
echo ""

# 获取 API 容器时间（如果运行）
echo "🐳 API 容器时间："
if docker ps | grep -q couponHub-api-prod; then
  docker exec couponHub-api-prod date
  echo ""
  echo "容器 TZ 环境变量："
  docker exec couponHub-api-prod sh -c 'echo $TZ'
else
  echo "⚠️  API 容器未运行"
fi
echo ""

# 获取最近订单时间
echo "📦 最近创建的订单时间："
docker exec -i postgres psql -U xinnix -d couponHub -c "
SELECT
  id,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  TO_CHAR(created_at + INTERVAL '8 hours', 'YYYY-MM-DD HH24:MI:SS') as estimated_beijing_time,
  CASE
    WHEN created_at + INTERVAL '8 hours' > NOW() THEN '⚠️  时间不对（显示UTC）'
    ELSE '✅ 时间正确（显示北京时间）'
  END as status
FROM orders
ORDER BY created_at DESC
LIMIT 3;
" 2>/dev/null || echo "⚠️  无法查询订单"
echo ""

echo "======================================"
echo "时区状态检查完成"
echo "======================================"