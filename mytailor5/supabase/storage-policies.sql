-- Storage 策略配置
-- 在 Supabase Dashboard -> Storage -> orders -> Policies 中执行这些策略

-- 策略 1: 允许用户上传自己的图片
-- Policy name: Users can upload their own images
-- Allowed operation: INSERT
-- Policy definition:
create policy "anon can upload"
on storage.objects
for insert
to public
with check (
  bucket_id = 'orders' and auth.role() = 'anon'
);

create policy "anon can view"
on storage.objects
for select
to public
using (
  bucket_id = 'orders' and auth.role() = 'anon'
);

create policy "anon can delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'orders' and auth.role() = 'anon'
);

