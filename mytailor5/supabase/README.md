# Supabase 部署指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 注册/登录账户
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - 项目名称：`liu-tailor-shop`（或您喜欢的名称）
   - 数据库密码：设置一个强密码（请保存好）
   - 区域：选择离您最近的区域
5. 等待项目创建完成（约 2 分钟）

## 2. 配置数据库

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 依次执行以下文件的内容：
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_public_access.sql`
3. 每个文件都点击 **Run** 执行

第一份 SQL 会创建表结构与触发器，第二份 SQL 会将系统切换到「免登录模式」，包括：
- 允许 `user_id` 为空并设置默认公共 ID
- 关闭 orders 表的 RLS，端上无需登录即可访问

## 3. 配置 Storage

1. 在 Supabase Dashboard 中，进入 **Storage**
2. 点击 **New bucket**
3. 创建存储桶：
   - 名称：`orders`
   - 公开访问：**关闭**（Private）
4. 点击 **Create bucket**

### 配置 Storage 策略

可以直接在 SQL Editor 中执行 `supabase/storage-policies.sql`，或在 Dashboard 中创建策略。策略逻辑如下（允许 anon 角色上传/查看/删除）：

```sql
create policy "anon can upload"
on storage.objects
for insert
to public
with check (bucket_id = 'orders' and auth.role() = 'anon');

create policy "anon can view"
on storage.objects
for select
to public
using (bucket_id = 'orders' and auth.role() = 'anon');

create policy "anon can delete"
on storage.objects
for delete
to public
using (bucket_id = 'orders' and auth.role() = 'anon');
```

## 4. 获取 API 密钥

1. 在 Supabase Dashboard 中，进入 **Settings** -> **API**
2. 复制以下值：
   - **Project URL** -> 这是 `VITE_SUPABASE_URL`
   - **anon public** key -> 这是 `VITE_SUPABASE_ANON_KEY`

## 5. 配置环境变量

1. 在项目根目录创建 `.env` 文件（复制 `.env.example`）
2. 填入您的 Supabase 配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 6. 部署到 Supabase

### 方法 1：使用 Supabase CLI（推荐）

1. 安装 Supabase CLI：
```bash
npm install -g supabase
```

2. 登录 Supabase：
```bash
supabase login
```

3. 链接项目：
```bash
supabase link --project-ref your-project-ref
```

4. 推送数据库迁移：
```bash
supabase db push
```

### 方法 2：使用 Vercel/Netlify 部署前端

1. 构建项目：
```bash
npm install
npm run build
```

2. 部署到 Vercel：
   - 连接 GitHub 仓库
   - 添加环境变量（从 `.env` 文件）
   - 部署

3. 部署到 Netlify：
   - 连接 GitHub 仓库
   - 构建命令：`npm run build`
   - 发布目录：`dist`
   - 添加环境变量

## 7. 免登录模式说明

- 本项目默认使用公共用户 ID（`PUBLIC_USER_ID`）写入 `orders` 表
- 由于关闭了 RLS，持有 anon key 的客户端即可直接读写订单
- 建议仅自己使用该链接；如果需要进一步保护，可以：
  - 在 Supabase 项目设置中限制允许访问的域名 / IP
  - 或重新启用 RLS，并在前端添加简单密码

## 8. 测试部署

1. 访问部署的网站
2. 直接创建一条订单（无需登录）
3. 检查图片上传和长图生成功能是否正常
4. 在 Supabase Dashboard 的 Table Editor 中确认数据已写入

## 故障排除

### 问题：无法上传或读取图片
- 检查 Storage 策略是否已允许 `auth.role() = 'anon'`
- 确认存储桶名称为 `orders`
- 查看浏览器控制台的具体错误

### 问题：无法读取订单
- 确认已经执行 `002_public_access.sql`
- 检查 Supabase Dashboard 中 orders 表的 RLS 是否已关闭

## 免费额度

Supabase 免费计划包括：
- 500 MB 数据库空间
- 1 GB 文件存储
- 2 GB 带宽
- 50,000 月度活跃用户

对于小型裁缝铺业务，这通常足够使用。

