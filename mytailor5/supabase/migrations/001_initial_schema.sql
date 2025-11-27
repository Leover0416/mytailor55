-- 启用必要的扩展
create extension if not exists "uuid-ossp";

-- 创建 orders 表
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_name text not null,
  created_at bigint not null,
  completed_at bigint,
  note text default '',
  price numeric(10, 2) not null,
  status text check (status in ('pending', 'completed')) default 'pending',
  source text check (source in ('online', 'offline')),
  tags text[] default array[]::text[],
  images text[] default array[]::text[],
  created_at_db timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引以提高查询性能
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_user_status_idx on public.orders(user_id, status);

-- 启用 Row Level Security (RLS)
alter table public.orders enable row level security;

-- 创建策略：用户只能查看和操作自己的订单
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own orders"
  on public.orders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own orders"
  on public.orders for delete
  using (auth.uid() = user_id);

-- 创建更新时间触发器
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_orders_updated_at
  before update on public.orders
  for each row
  execute function update_updated_at_column();

