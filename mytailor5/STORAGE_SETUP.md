# Supabase Storage 配置指南

## 📋 重要说明

`supabase/storage-policies.sql` 文件**不需要**部署到任何后端服务器，而是需要在 **Supabase Dashboard** 中执行。

## 🚀 配置步骤

### 第一步：创建 Storage Bucket

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 点击左侧菜单的 **Storage**
4. 点击 **New bucket** 按钮
5. 填写信息：
   - **Name**: `orders`（必须完全一致）
   - **Public bucket**: ✅ **开启**（重要！必须勾选）
6. 点击 **Create bucket**

### 第二步：执行 Storage 策略 SQL

1. 在 Supabase Dashboard 中，点击左侧菜单的 **SQL Editor**
2. 点击 **New query** 按钮
3. 打开项目中的 `supabase/storage-policies.sql` 文件
4. **复制文件中的所有内容**（包括注释）
5. 粘贴到 SQL Editor 中
6. 点击右上角的 **Run** 按钮执行

### 第三步：验证配置

执行 SQL 后，您应该看到类似这样的成功消息：
```
Success. No rows returned
```

### 第四步：检查策略是否生效

1. 在 Supabase Dashboard 中，进入 **Storage** -> **orders** -> **Policies**
2. 您应该看到三个策略：
   - ✅ `anon can upload` (INSERT)
   - ✅ `anon can view` (SELECT)
   - ✅ `anon can delete` (DELETE)

## ⚠️ 常见问题

### 问题 1：执行 SQL 时报错 "policy already exists"

**解决方法**：
- 文件已经包含了 `DROP POLICY IF EXISTS` 语句，应该会自动删除旧策略
- 如果仍然报错，可以手动在 SQL Editor 中执行：
  ```sql
  DROP POLICY IF EXISTS "anon can upload" ON storage.objects;
  DROP POLICY IF EXISTS "anon can view" ON storage.objects;
  DROP POLICY IF EXISTS "anon can delete" ON storage.objects;
  ```
- 然后再执行完整的 `storage-policies.sql` 文件

### 问题 2：图片上传失败

**检查清单**：
- ✅ Storage bucket 名称是否为 `orders`（完全一致）
- ✅ Bucket 是否设置为 **Public**（公开访问）
- ✅ 是否已执行 `storage-policies.sql` 中的所有策略
- ✅ 浏览器控制台是否有错误信息

### 问题 3：图片无法显示

**检查清单**：
- ✅ Bucket 是否设置为 **Public**
- ✅ 是否创建了 `anon can view` 策略
- ✅ 图片路径格式是否正确（应该是 `public/订单ID/0.jpg` 格式）

## 📝 策略说明

这些策略允许：
- **匿名用户（anon）** 可以上传、查看、删除 `orders` bucket 中的图片
- 这是为了支持免登录模式，让任何人都可以上传图片

## 🔒 安全提示

由于启用了匿名访问，建议：
- 仅自己使用该应用链接
- 不要公开分享链接
- 定期检查 Storage 使用情况

## ✅ 配置完成后

配置完成后，您的图片上传功能应该可以正常工作了。如果还有问题，请检查：
1. 浏览器控制台的错误信息
2. Supabase Dashboard 中的 Storage 日志
3. 网络请求是否成功（在浏览器开发者工具的 Network 标签中查看）

