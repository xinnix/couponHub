#!/bin/bash
# 时区配置验证脚本
# 用于验证时区修复是否成功

echo "🔍 时区配置验证工具"
echo "======================================"
echo ""

# ===== 1. 检查环境变量 =====
echo "1️⃣  检查环境变量配置"
echo "--------------------------------------"

# 检查 .env 文件
if [ -f ".env" ]; then
  if grep -q "^TZ=" .env; then
    TZ_VALUE=$(grep "^TZ=" .env | cut -d'=' -f2)
    echo "✅ .env 文件中已设置 TZ=$TZ_VALUE"
  else
    echo "❌ .env 文件中未设置 TZ 环境变量"
    echo "   请添加: TZ=Asia/Shanghai"
  fi
else
  echo "⚠️  .env 文件不存在"
fi

# 检查 1panel.env 文件
if [ -f "1panel.env" ]; then
  if grep -q "^TZ=" 1panel.env; then
    TZ_VALUE=$(grep "^TZ=" 1panel.env | cut -d'=' -f2)
    echo "✅ 1panel.env 文件中已设置 TZ=$TZ_VALUE"
  else
    echo "❌ 1panel.env 文件中未设置 TZ 环境变量"
    echo "   请添加: TZ=Asia/Shanghai"
  fi
else
  echo "⚠️  1panel.env 文件不存在（生产环境需要创建）"
  echo "   参考 1panel.env.example 创建"
fi

echo ""

# ===== 2. 检查 Dockerfile =====
echo "2️⃣  检查 Dockerfile 配置"
echo "--------------------------------------"

# 检查 Dockerfile.api
if [ -f "Dockerfile.api" ]; then
  if grep -q "TZ=Asia/Shanghai" Dockerfile.api && grep -q "apk add.*tzdata" Dockerfile.api; then
    echo "✅ Dockerfile.api 已正确配置时区"
  else
    echo "❌ Dockerfile.api 缺少时区配置"
    echo "   需要："
    echo "   - ENV TZ=Asia/Shanghai"
    echo "   - RUN apk add --no-cache tzdata"
  fi
else
  echo "⚠️  Dockerfile.api 不存在"
fi

# 检查 Dockerfile.admin
if [ -f "Dockerfile.admin" ]; then
  if grep -q "TZ=Asia/Shanghai" Dockerfile.admin && grep -q "apk add.*tzdata" Dockerfile.admin; then
    echo "✅ Dockerfile.admin 已正确配置时区"
  else
    echo "❌ Dockerfile.admin 缺少时区配置"
    echo "   需要："
    echo "   - ENV TZ=Asia/Shanghai"
    echo "   - RUN apk add --no-cache tzdata"
  fi
else
  echo "⚠️  Dockerfile.admin 不存在"
fi

echo ""

# ===== 3. 检查 docker-compose =====
echo "3️⃣  检查 Docker Compose 配置"
echo "--------------------------------------"

# 检查 docker-compose.prod.yml
if [ -f "docker-compose.prod.yml" ]; then
  if grep -q "TZ=Asia/Shanghai" docker-compose.prod.yml; then
    echo "✅ docker-compose.prod.yml 已配置 TZ 环境变量"
  else
    echo "❌ docker-compose.prod.yml 缺少 TZ 环境变量"
    echo "   请在 api 和 admin 服务中添加："
    echo "   environment:"
    echo "     - TZ=Asia/Shanghai"
  fi
else
  echo "⚠️  docker-compose.prod.yml 不存在"
fi

echo ""

# ===== 4. 检查运行中的容器 =====
echo "4️⃣  检查运行中的容器时区"
echo "--------------------------------------"

# 检查 API 容器
API_CONTAINER="couponHub-api-prod"
if docker ps | grep -q "$API_CONTAINER"; then
  echo "API 容器 ($API_CONTAINER) 正在运行"

  # 检查容器时区环境变量
  CONTAINER_TZ=$(docker exec $API_CONTAINER sh -c 'echo $TZ' 2>/dev/null)
  if [ -n "$CONTAINER_TZ" ]; then
    echo "  容器 TZ 环境变量: $CONTAINER_TZ"
  else
    echo "  ⚠️  容器 TZ 环境变量未设置"
  fi

  # 检查容器当前时间
  CONTAINER_DATE=$(docker exec $API_CONTAINER date 2>/dev/null)
  echo "  容器当前时间: $CONTAINER_DATE"

  # 检查本地时间
  LOCAL_DATE=$(date)
  echo "  本地系统时间: $LOCAL_DATE"

  # 检查时间偏差
  if [[ "$CONTAINER_DATE" == *CST* ]] || [[ "$CONTAINER_DATE" == *"Asia/Shanghai"* ]]; then
    echo "  ✅ 容器时区设置正确（显示 CST 或 Asia/Shanghai）"
  else
    echo "  ❌ 容器时区可能仍为 UTC（未显示 CST）"
  fi

else
  echo "⚠️  API 容器 ($API_CONTAINER) 未运行"
  echo "   启动命令: docker-compose -f docker-compose.prod.yml up -d api"
fi

echo ""

# 检查 Admin 容器
ADMIN_CONTAINER="couponHub-admin-prod"
if docker ps | grep -q "$ADMIN_CONTAINER"; then
  echo "Admin 容器 ($ADMIN_CONTAINER) 正在运行"

  CONTAINER_TZ=$(docker exec $ADMIN_CONTAINER sh -c 'echo $TZ' 2>/dev/null || echo "N/A")
  echo "  容器 TZ 环境变量: $CONTAINER_TZ"

  CONTAINER_DATE=$(docker exec $ADMIN_CONTAINER date 2>/dev/null || echo "无法获取")
  echo "  容器当前时间: $CONTAINER_DATE"

else
  echo "⚠️  Admin 容器 ($ADMIN_CONTAINER) 未运行"
fi

echo ""

# ===== 5. 检查数据库时区 =====
echo "5️⃣  检查 PostgreSQL 数据库时区"
echo "--------------------------------------"

# 检查本地数据库容器
DB_CONTAINER="postgres"
if docker ps | grep -q "$DB_CONTAINER"; then
  echo "数据库容器 ($DB_CONTAINER) 正在运行"

  DB_TIMEZONE=$(docker exec $DB_CONTAINER psql -U xinnix -d couponHub -t -c "SHOW timezone;" 2>/dev/null | xargs)
  echo "  数据库时区: $DB_TIMEZONE"

  if [[ "$DB_TIMEZONE" == *"Asia/Shanghai"* ]] || [[ "$DB_TIMEZONE" == *"PRC"* ]]; then
    echo "  ✅ 数据库时区已设置为北京时间"
  elif [[ "$DB_TIMEZONE" == *"UTC"* ]]; then
    echo "  ⚠️  数据库时区仍为 UTC"
    echo "     如果应用已设置 Asia/Shanghai，数据库保持 UTC 也是可以接受的"
    echo "     Node.js 会自动处理时区转换"
  else
    echo "  ⚠️  数据库时区: $DB_TIMEZONE"
  fi

  # 查询一条记录验证时间
  echo ""
  echo "  测试查询数据库时间："
  docker exec $DB_CONTAINER psql -U xinnix -d couponHub -c "SELECT NOW() as current_time, CURRENT_TIMESTAMP as timestamp;" 2>/dev/null

else
  echo "⚠️  数据库容器 ($DB_CONTAINER) 未运行"
  echo "   如果使用外部数据库，请手动检查时区："
  echo "   psql $DATABASE_URL -c 'SHOW timezone;'"
fi

echo ""

# ===== 6. 测试应用时间记录 =====
echo "6️⃣  测试应用时间记录"
echo "--------------------------------------"

# 检查最近创建的订单时间
if [ -n "$DATABASE_URL" ]; then
  echo "查询最近创建的订单时间："

  # 使用 psql 查询（如果可用）
  if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -c "
      SELECT
        id,
        created_at,
        updated_at,
        (created_at + INTERVAL '8 hours') as created_at_beijing_estimate
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5;
    " 2>/dev/null

    echo ""
    echo "说明："
    echo "  - 如果 created_at 与本地时间相差 8 小时，说明时区有问题"
    echo "  - created_at_beijing_estimate 是估算的北京时间（用于对比）"
    echo "  - 修复后，created_at 应直接显示正确的北京时间"
  else
    echo "⚠️  psql 客户端不可用，无法测试数据库记录"
    echo "   请手动查询数据库验证时间字段"
  fi
else
  echo "⚠️  DATABASE_URL 未设置，无法测试数据库"
fi

echo ""

# ===== 总结 =====
echo "======================================"
echo "📋 验证总结"
echo "======================================"
echo ""

echo "已完成以下检查："
echo "  ✅ 环境变量配置"
echo "  ✅ Dockerfile 配置"
echo "  ✅ Docker Compose 配置"
echo "  ✅ 运行中的容器时区"
echo "  ✅ 数据库时区"
echo "  ✅ 应用时间记录测试"
echo ""

echo "下一步操作："
echo "  1. 如果发现配置缺失，请按照提示修复"
echo "  2. 重新构建镜像："
echo "     docker build -f Dockerfile.api -t couponhub-api:latest ."
echo "     docker build -f Dockerfile.admin -t couponhub-admin:latest ."
echo ""
echo "  3. 重启容器："
echo "     docker-compose -f docker-compose.prod.yml down"
echo "     docker-compose -f docker-compose.prod.yml --env-file 1panel.env up -d"
echo ""
echo "  4. 验证修复效果："
echo "     再次运行此脚本验证时区配置"
echo ""

echo "======================================"
echo "验证完成！"
echo "======================================"