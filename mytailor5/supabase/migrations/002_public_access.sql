-- 迁移 002：开启免登录模式

-- 1. user_id 允许为空，并设置默认公共用户 ID
alter table public.orders
  alter column user_id drop not null,
  alter column user_id set default '00000000-0000-0000-0000-000000000001';

-- 2. 将现有数据中的 null user_id 填充为公共 ID
update public.orders
  set user_id = '00000000-0000-0000-0000-000000000001'
  where user_id is null;

-- 3. 关闭 RLS，让所有请求都可读写（仅限于携带 anon key 的客户端）
alter table public.orders disable row level security;

