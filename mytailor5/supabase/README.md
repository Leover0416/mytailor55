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
2. 点击 **New Query**
3. 复制 `supabase/migrations/001_initial_schema.sql` 文件的内容
4. 粘贴到 SQL Editor 中
5. 点击 **Run** 执行 SQL

这将创建：
- `orders` 表
- 必要的索引
- Row Level Security (RLS) 策略
- 自动更新时间戳的触发器

## 3. 配置 Storage

1. 在 Supabase Dashboard 中，进入 **Storage**
2. 点击 **New bucket**
3. 创建存储桶：
   - 名称：`orders`
   - 公开访问：**关闭**（Private）
4. 点击 **Create bucket**

### 配置 Storage 策略

1. 在 Storage 页面，点击 `orders` 存储桶
2. 进入 **Policies** 标签
3. 点击 **New Policy**，选择 **Create policy from scratch**
4. 创建以下策略：

**策略 1：允许用户上传自己的图片**
- Policy name: `Users can upload their own images`
- Allowed operation: `INSERT`
- Policy definition:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
```

**策略 2：允许用户查看自己的图片**
- Policy name: `Users can view their own images`
- Allowed operation: `SELECT`
- Policy definition:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
```

**策略 3：允许用户删除自己的图片**
- Policy name: `Users can delete their own images`
- Allowed operation: `DELETE`
- Policy definition:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
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

## 7. 配置认证（可选）

如果需要邮箱验证：

1. 在 Supabase Dashboard 中，进入 **Authentication** -> **Settings**
2. 配置邮箱模板（可选）
3. 可以关闭 "Enable email confirmations" 以简化注册流程

## 8. 测试部署

1. 访问部署的网站
2. 注册一个新账户
3. 创建一条测试订单
4. 检查数据是否保存到 Supabase 数据库

## 故障排除

### 问题：无法上传图片
- 检查 Storage 策略是否正确配置
- 确认存储桶名称是 `orders`
- 检查用户是否已登录

### 问题：无法查询订单
- 检查 RLS 策略是否正确
- 确认用户 ID 匹配

### 问题：认证失败
- 检查环境变量是否正确
- 确认 Supabase URL 和 Key 正确

## 免费额度

Supabase 免费计划包括：
- 500 MB 数据库空间
- 1 GB 文件存储
- 2 GB 带宽
- 50,000 月度活跃用户

对于小型裁缝铺业务，这通常足够使用。

