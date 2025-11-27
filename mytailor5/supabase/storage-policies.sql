-- Storage 策略配置
-- 在 Supabase Dashboard -> Storage -> orders -> Policies 中执行这些策略

-- 策略 1: 允许用户上传自己的图片
-- Policy name: Users can upload their own images
-- Allowed operation: INSERT
-- Policy definition:
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 策略 2: 允许用户查看自己的图片
-- Policy name: Users can view their own images
-- Allowed operation: SELECT
-- Policy definition:
CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 策略 3: 允许用户删除自己的图片
-- Policy name: Users can delete their own images
-- Allowed operation: DELETE
-- Policy definition:
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

