-- 设置新闻为 Hero 新闻（头图展示）
-- 执行此脚本将新闻设置为首页头图展示

-- 将新闻 n1 设置为 Hero 新闻
UPDATE news
SET "isHero" = true
WHERE id = 'n1';

-- 或者取消 Hero 新闻
-- UPDATE news SET "isHero" = false WHERE id = 'n1';

-- 查询所有 Hero 新闻
SELECT id, title, "isHero", status
FROM news
WHERE "isHero" = true;