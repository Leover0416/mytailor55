-- Storage 策略配置
-- 在 Supabase Dashboard -> Storage -> orders -> Policies 中执行这些策略
-- 建议将 orders bucket 设置为 public，下列策略主要限制写入/删除操作

create policy "anon can upload"
on storage.objects
for insert
to public
with check (
  bucket_id = 'orders' and auth.role() = 'anon'
);

create policy "anon can delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'orders' and auth.role() = 'anon'
);

