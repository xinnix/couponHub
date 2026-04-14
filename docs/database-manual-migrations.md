# 手动迁移记录

本文档记录生产环境数据库手动字段修复操作，补充自动化迁移无法覆盖的场景。

---

## 2026-04-14: 修复缺失字段

### 问题诊断

生产环境 Prisma 运行时报错：
```
PrismaClientKnownRequestError: The column (not available) does not exist
```

原因：手动迁移 SQL 执行后，部分表的字段与 schema 定义不匹配。

---

### 修复内容

#### 1. coupon_templates 表 - 时间字段迁移

**问题：**
- Schema 使用新字段：`saleFrom`, `saleUntil`, `useFrom`, `useUntil`
- 数据库使用旧字段：`validFrom`, `validUntil`

**修复 SQL：**
```sql
-- 1. 添加新字段
ALTER TABLE coupon_templates
  ADD COLUMN IF NOT EXISTS "saleFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "saleUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "useFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "useUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. 迁移数据（从旧字段复制）
UPDATE coupon_templates SET
  "saleFrom" = "validFrom",
  "saleUntil" = "validUntil",
  "useFrom" = "validFrom",
  "useUntil" = "validUntil";

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS "coupon_templates_saleFrom_saleUntil_idx"
  ON coupon_templates ("saleFrom", "saleUntil");
CREATE INDEX IF NOT EXISTS "coupon_templates_useFrom_useUntil_idx"
  ON coupon_templates ("useFrom", "useUntil");
```

**验证：**
```sql
SELECT id, title, "saleFrom", "saleUntil", "useFrom", "useUntil", "validFrom", "validUntil"
FROM coupon_templates;
```

**结果：**
- ✅ 所有字段都已正确迁移
- ⚠️ 旧字段 `validFrom`, `validUntil` 保留（以防回滚）

---

#### 2. news 表 - 小程序码字段缺失

**问题：**
- Schema 定义：`qrcodeUrl`, `qrcodeGeneratedAt`
- 数据库缺失这两个字段

**修复 SQL：**
```sql
-- 添加缺失字段
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS "qrcodeUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "qrcodeGeneratedAt" TIMESTAMP(3);
```

**验证：**
```sql
\d news
```

**结果：**
- ✅ 字段已添加，允许 NULL 值

---

#### 3. Prisma Migration 表 - 手动标记

**问题：**
- 手动执行迁移 SQL 后，`_prisma_migrations` 表缺少记录
- 导致下次启动可能重复执行迁移

**修复 SQL：**
```sql
-- 插入迁移记录（标记为已应用）
INSERT INTO _prisma_migrations (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid(),
  'manual',
  NOW(),
  '20260414115035_init_complete',
  'manual',
  NOW(),
  1
);
```

**验证：**
```sql
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC;
```

**结果：**
- ✅ 迁移记录已插入
- ✅ 下次启动不会重复执行

---

### 后续步骤

1. **重新生成 Prisma Client**
   ```bash
   cd infra/database && npx prisma generate
   ```

2. **重新构建 Docker 镜像**
   ```bash
   docker build -f Dockerfile.api -t opencode-api:latest .
   ```

3. **重启服务**
   ```bash
   docker-compose restart api
   ```

4. **验证日志**
   - 应显示 "No pending migrations to apply"
   - 不应出现 "The column does not exist" 错误

---

### 预防措施

**未来迁移流程改进：**

1. ✅ 确保 `.gitignore` 不排除 `migrations/` 目录（已修复）
2. ✅ 使用 `prisma migrate dev` 生成迁移文件
3. ✅ 测试迁移 SQL 在生产环境兼容性
4. ✅ 手动修复后标记 `_prisma_migrations` 表

**检查脚本（可定期运行）：**

```bash
# 检查所有表字段是否与 schema 一致
docker exec -e PGPASSWORD=x12345678 postgres psql \
  -h 47.109.94.212 -U xinnix -d couponHub \
  -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name;"
```

---

### 相关 Commit

- **c4578e3**: fix(database): 重建完整迁移历史
- **371d58e**: fix(docker): 移除迁移 timeout 限制
- **手动修复**: 2026-04-14 字段迁移

---

## 参考资源

- [Prisma Migration 手动标记](https://www.prisma.io/docs/concepts/components/prisma-migrate/manually-applying-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Prisma Schema 验证](https://www.prisma.io/docs/concepts/components/prisma-schema/validation)