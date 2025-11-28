-- Storage 策略配置
-- 重要：需要在 Supabase Dashboard 的 SQL Editor 中执行这些 SQL 语句
-- 执行步骤：
-- 1. 登录 Supabase Dashboard (https://supabase.com/dashboard)
-- 2. 选择您的项目
-- 3. 点击左侧菜单的 "SQL Editor"
-- 4. 点击 "New query"
-- 5. 复制粘贴下面的所有 SQL 语句
-- 6. 点击 "Run" 执行

-- 注意：如果策略已存在，会报错。可以先删除旧策略，或使用 DROP POLICY IF EXISTS

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "anon can upload" ON storage.objects;
DROP POLICY IF EXISTS "anon can view" ON storage.objects;
DROP POLICY IF EXISTS "anon can delete" ON storage.objects;

-- 允许匿名用户上传图片到 orders bucket
CREATE POLICY "anon can upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'orders' AND auth.role() = 'anon'
);

-- 允许匿名用户查看 orders bucket 中的图片
CREATE POLICY "anon can view"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'orders' AND auth.role() = 'anon'
);

-- 允许匿名用户删除 orders bucket 中的图片
CREATE POLICY "anon can delete"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'orders' AND auth.role() = 'anon'
);

