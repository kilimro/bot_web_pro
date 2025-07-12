# bot_web

## 简介
这是一个前后端分离的项目，支持本地部署和 Vercel 一键部署。

## 🚀 快速部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/bot_web)

### Vercel 部署步骤：

1. **点击一键部署**
   - 点击上方的 "Deploy with Vercel" 按钮
   - 连接你的 GitHub 账户并导入项目

2. **配置环境变量**
   在 Vercel 部署界面的环境变量设置中添加以下变量：
   ```
   VITE_SUPABASE_URL=你的Supabase项目URL
   VITE_SUPABASE_ANON_KEY=你的Supabase_anon_public_Key
   SUPABASE_SERVICE_ROLE_KEY=你的SUPABASE_SERVICE_ROLE_KEY
   VITE_API_ADMIN_KEY=设置一个管理员密钥
   ```

3. **开始部署**
   - 点击 "Deploy" 开始部署
   - 等待部署完成（通常需要 2-3 分钟）

4. **访问应用**
   - 部署完成后，你的应用将在 `https://your-project.vercel.app` 可用
   - 使用配置的管理员账户登录系统

### 🔧 Vercel 部署特性

- ✅ **自动构建**: 代码推送后自动构建和部署
- ✅ **全球 CDN**: 享受 Vercel 的全球加速网络
- ✅ **HTTPS**: 自动配置 SSL 证书
- ✅ **自定义域名**: 支持绑定自己的域名
- ✅ **环境变量**: 安全的环境变量管理
- ✅ **Serverless API**: 后端 API 自动转换为 serverless 函数

### ⚠️ Vercel 部署注意事项

1. **WebSocket 限制**: Vercel 对 WebSocket 支持有限，实时消息功能可能受影响
2. **函数超时**: Serverless 函数有执行时间限制（最大 30 秒）
3. **冷启动**: 函数可能存在冷启动延迟
4. **并发限制**: 免费版有并发请求限制

### 🔄 混合部署方案（推荐生产环境）

对于生产环境，建议采用混合部署：

**方案一：前端 Vercel + 后端独立服务器**
- 前端：部署到 Vercel（享受 CDN 加速）
- 后端：部署到支持 WebSocket 的服务器（Railway、Render、自建服务器等）

**方案二：全栈独立服务器**
- 适合需要完整 WebSocket 功能的场景
- 参考下方的本地部署文档

---

## 📋 本地部署文档

### 1. 注册 Supabase
1.  访问 [Supabase 官网](https://supabase.io/)
2.  点击 "Start your project" 按钮
3.  注册一个新账户或使用现有账户登录
4.  创建一个新的项目，填写项目名称并**妥善保管数据库密码**
5.  项目创建完成后，在项目设置的 API 部分，记下项目的 **URL** 和 **anon public Key**

### 2. 导入数据库
1.  在 Supabase 控制台中，进入您创建的项目
2.  在左侧导航栏中，选择 "SQL Editor" (SQL 编辑器)
3.  点击 "+ New query" (+ 新建查询)
4.  将 `/supabase` 文件夹中的 SQL 文件内容复制并执行
5.  检查表和数据是否已成功导入

### 3. 部署后端 (`/server`)
1.  **安装依赖**:
    ```bash
    cd server
    npm install
    ```

2.  **配置环境变量**:
    在 `/server` 目录下创建 `.env` 文件：
    ```env
    VITE_SUPABASE_URL=你的Supabase项目URL
    VITE_SUPABASE_ANON_KEY=你的Supabase_anon_public_Key
    SUPABASE_SERVICE_ROLE_KEY=你的SUPABASE_SERVICE_ROLE_KEY
    ```

3.  **启动后端服务**:
    ```bash
    node wss-service.js
    ```

### 4. 部署前端

1.  **安装依赖**:
    ```bash
    npm install
    ```

2.  **配置环境变量**:
    在根目录下创建 `.env` 文件：
    ```env
    VITE_SUPABASE_URL=你的Supabase项目URL
    VITE_SUPABASE_ANON_KEY=你的Supabase_anon_public_Key
    VITE_API_BASE_URL=http://localhost:3000
    VITE_WS_BASE_URL=ws://localhost:3000
    VITE_API_SERVER_URL=http://localhost:3031
    VITE_API_ADMIN_KEY=your_admin_key_here
    ```

3.  **启动开发服务**:
    ```bash
    npm run dev
    ```

4.  **构建生产版本**:
    ```bash
    npm run build
    ```

---

## 🛠️ 技术栈

- **前端**: React + TypeScript + Tailwind CSS + Vite
- **后端**: Node.js + WebSocket
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel (前端) + 可选独立服务器 (后端)
- **状态管理**: React Context + Supabase Realtime

## 📝 其他说明

- 确保已安装最新版本的 Node.js (16+) 和 npm
- Supabase 免费套餐有使用限制，请根据项目需求评估是否需要升级
- 前端环境变量必须以 `VITE_` 前缀开头才能在客户端代码中访问
- 生产环境建议使用 HTTPS 和安全的环境变量管理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License