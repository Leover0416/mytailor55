# 小刘裁缝铺

一个专业的裁缝铺订单管理系统，支持订单创建、图片管理、数据统计和云端存储。

## 功能特性

- 📝 订单管理：创建、编辑、删除订单
- 📸 图片上传：支持多张图片，自动压缩
- 🏷️ 标签系统：快速标签分类
- 📊 数据统计：周视图和月报表
- ☁️ 云端存储：使用 Supabase 安全存储数据
- 🚪 免登录访问：任意设备打开即用，无需登录
- 📱 PWA：可添加到桌面，支持基础离线访问
- 📤 数据导出：支持 JSON 和 CSV 格式导出

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入您的 Supabase 配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 设置 Supabase

请参考 `supabase/README.md` 中的详细说明来配置 Supabase 数据库和存储（包含免登录模式所需的 SQL 迁移和 Storage 策略）。

### 4. 运行项目

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

## 部署

请参考 `DEPLOYMENT.md` 了解详细的部署指南。

## 技术栈

- React + TypeScript
- Vite
- Supabase (数据库 + 存储)
- Tailwind CSS
- Recharts (数据可视化)

## 许可证

MIT
