# 部署指南

## 快速开始

### 1. 准备 Supabase 项目

按照 `supabase/README.md` 中的说明设置 Supabase 项目。

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入您的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的 Supabase 配置。

### 4. 本地开发

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录中。

## 部署选项

### 选项 1：Vercel（推荐）

1. 将代码推送到 GitHub
2. 访问 [Vercel](https://vercel.com)
3. 导入 GitHub 仓库
4. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 部署

### 选项 2：Netlify

1. 将代码推送到 GitHub
2. 访问 [Netlify](https://netlify.com)
3. 导入 GitHub 仓库
4. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
5. 添加环境变量
6. 部署

### 选项 3：Supabase Hosting（新功能）

如果 Supabase 提供 Hosting 服务，可以直接在 Supabase Dashboard 中部署。

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |

## 注意事项

1. **安全性**：本项目默认关闭 orders 表 RLS，实现免登录访问。请保管好部署地址和 anon key，必要时在 Supabase 设置中限制允许访问的域名/IP。
2. **图片存储**：图片存储在 Supabase Storage 的 `orders` bucket，并通过签名 URL 访问。请务必按照 `supabase/storage-policies.sql` 配置策略。
3. **数据备份**：建议定期导出数据（使用设置页面的导出功能）

## 更新部署

每次更新代码后：

1. 提交代码到 Git
2. 推送到 GitHub
3. Vercel/Netlify 会自动重新部署

如果需要更新数据库结构：

1. 修改/新增 `supabase/migrations/*.sql`
2. 在 Supabase Dashboard 的 SQL Editor 中依次执行
3. 或者使用 Supabase CLI：`supabase db push`

