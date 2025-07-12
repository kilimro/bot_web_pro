# bot_web

## 简介
这是一个前后端分离的项目（适配855）。后端使用 Node.js。前端代码位于项目录，后端代码在server里。该项目使用 Supabase 作为数据库//免费的，也可以私有化部署。
有能力的二开吧，因工作时间有限，实在没时间开发了...

## 🚀 快速部署

### 方案一：Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kilimro/m_botweb)

#### 1. 部署前端到 Vercel

1. **点击上方的 "Deploy with Vercel" 按钮**
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

#### 2. 初始化 Supabase 数据库

1. **注册 Supabase**
   - 访问 [Supabase 官网](https://supabase.io/)
   - 创建一个新账户或使用现有账户登录
   - 创建一个新项目，记下项目 URL 和 anon key

2. **一键导入数据库结构**
   - 在 Supabase 控制台中，进入 SQL 编辑器
   - 点击 "New query"
   - 将以下 SQL 代码复制到编辑器中：

   ```sql
   -- 创建必要的扩展
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   
   -- 创建用户表
   CREATE TABLE IF NOT EXISTS users (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     email text UNIQUE NOT NULL,
     password_hash text NOT NULL,
     created_at timestamptz DEFAULT now(),
     last_login timestamptz,
     is_active boolean DEFAULT true
   );
   
   -- 创建机器人表
   CREATE TABLE IF NOT EXISTS bots (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     auth_key text UNIQUE NOT NULL,
     status text NOT NULL DEFAULT 'offline',
     wxid text,
     nickname text,
     avatar_url text,
     created_at timestamptz DEFAULT now(),
     last_active_at timestamptz,
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     CONSTRAINT status_check CHECK (status IN ('offline', 'online', 'authenticating'))
   );
   
   -- 创建机器人事件表
   CREATE TABLE IF NOT EXISTS bot_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
     event_type text NOT NULL,
     message text NOT NULL,
     details jsonb DEFAULT '{}'::jsonb,
     created_at timestamptz DEFAULT now(),
     CONSTRAINT event_type_check CHECK (event_type IN ('info', 'success', 'warning', 'error'))
   );
   
   -- 创建机器人消息表
   CREATE TABLE IF NOT EXISTS bot_messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
     msg_id bigint NOT NULL,
     from_user text NOT NULL,
     to_user text NOT NULL,
     msg_type integer NOT NULL,
     content text NOT NULL,
     status integer NOT NULL,
     created_at timestamptz DEFAULT now(),
     source text,
     CONSTRAINT msg_id_bot_id_key UNIQUE (msg_id, bot_id)
   );
   
   -- 创建机器人资料表
   CREATE TABLE IF NOT EXISTS bot_profiles (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
     username text,
     nickname text,
     bind_uin bigint,
     bind_email text,
     bind_mobile text,
     sex integer,
     level integer,
     experience integer,
     alias text,
     big_head_img_url text,
     small_head_img_url text,
     updated_at timestamptz DEFAULT now(),
     CONSTRAINT bot_profiles_bot_id_key UNIQUE (bot_id)
   );
   
   -- 创建关键词回复表
   CREATE TABLE IF NOT EXISTS keyword_replies (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     keyword text NOT NULL,
     reply text NOT NULL,
     reply_type text NOT NULL,
     match_type text NOT NULL,
     scope text NOT NULL DEFAULT 'all',
     description text,
     is_active boolean NOT NULL DEFAULT true,
     created_at timestamptz DEFAULT now(),
     bot_id uuid REFERENCES bots(id) ON DELETE CASCADE,
     message_type text NOT NULL DEFAULT 'text',
     message_content text,
     updated_at timestamptz DEFAULT now(),
     CONSTRAINT reply_type_check CHECK (reply_type IN ('text', 'image', 'voice')),
     CONSTRAINT match_type_check CHECK (match_type IN ('exact', 'fuzzy', 'regex')),
     CONSTRAINT scope_check CHECK (scope IN ('all', 'private', 'group'))
   );
   
   -- 创建插件表
   CREATE TABLE IF NOT EXISTS plugins (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     description text,
     trigger text NOT NULL,
     code text NOT NULL,
     is_active boolean DEFAULT true,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now(),
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
   );
   
   -- 创建AI模型表
   CREATE TABLE IF NOT EXISTS ai_models (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     enabled boolean DEFAULT false,
     name text NOT NULL,
     model text NOT NULL,
     base_url text NOT NULL,
     api_key text NOT NULL,
     system_prompt text NOT NULL,
     trigger_prefix text NOT NULL,
     block_list text[] DEFAULT ARRAY['wexin'],
     send_type text NOT NULL CHECK (send_type IN ('all', 'private', 'group')),
     group_whitelist text[] DEFAULT ARRAY['all'],
     enable_split_send boolean DEFAULT true,
     split_send_interval integer DEFAULT 3000,
     reply_probability integer DEFAULT 100 CHECK (reply_probability BETWEEN 1 AND 100),
     context_count integer DEFAULT 0 CHECK (context_count BETWEEN 0 AND 20),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
     updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
     at_reply_enabled integer DEFAULT 1
   );
   
   -- 创建AI配置表
   CREATE TABLE IF NOT EXISTS ai_configs (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     base_url text NOT NULL,
     model text NOT NULL,
     api_key text NOT NULL,
     system_prompt text,
     image_base_url text,
     image_model text,
     image_api_key text,
     created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
     updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   
   -- 创建授权密钥表
   CREATE TABLE IF NOT EXISTS auth_keys (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     key text NOT NULL UNIQUE,
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
     updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
     expires_at timestamptz NOT NULL,
     is_used boolean DEFAULT false,
     created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
   );
   
   -- 创建好友表
   CREATE TABLE IF NOT EXISTS friends (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
     wx_id text NOT NULL,
     nickname text NOT NULL,
     remark text,
     sex integer,
     province text,
     city text,
     signature text,
     alias text,
     country text,
     avatar_url text,
     status text NOT NULL CHECK (status IN ('active', 'inactive')),
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     UNIQUE(wx_id, user_id)
   );
   
   -- 创建朋友圈表
   CREATE TABLE IF NOT EXISTS moments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     content text NOT NULL,
     type text NOT NULL DEFAULT 'friend_circle',
     status text NOT NULL DEFAULT 'published',
     publish_time timestamptz NOT NULL DEFAULT now(),
     image_urls text[],
     user_id uuid NOT NULL REFERENCES auth.users(id),
     bot_id uuid NOT NULL REFERENCES bots(id),
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   
   -- 创建临时图片表
   CREATE TABLE IF NOT EXISTS temp_images (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     image_data text NOT NULL,
     created_at timestamptz DEFAULT timezone('utc'::text, now())
   );
   
   -- 创建系统设置表
   CREATE TABLE IF NOT EXISTS system_settings (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     key text NOT NULL UNIQUE,
     value text NOT NULL,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   
   -- 创建更新时间的触发器函数
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = now();
     RETURN NEW;
   END;
   $$ language 'plpgsql';
   
   -- 创建处理更新时间的函数
   CREATE OR REPLACE FUNCTION handle_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = timezone('utc'::text, now());
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   -- 创建AI模型更新时间的触发器函数
   CREATE OR REPLACE FUNCTION update_ai_models_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = timezone('utc'::text, now());
     RETURN NEW;
   END;
   $$ language 'plpgsql';
   
   -- 创建触发器
   CREATE TRIGGER update_bot_instances_updated_at
     BEFORE UPDATE ON bots
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER update_keyword_replies_updated_at
     BEFORE UPDATE ON keyword_replies
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER update_plugins_updated_at
     BEFORE UPDATE ON plugins
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER update_system_settings_updated_at
     BEFORE UPDATE ON system_settings
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER update_auth_keys_updated_at
     BEFORE UPDATE ON auth_keys
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER update_friends_updated_at
     BEFORE UPDATE ON friends
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   
   CREATE TRIGGER set_updated_at
     BEFORE UPDATE ON moments
     FOR EACH ROW
     EXECUTE FUNCTION handle_updated_at();
   
   CREATE TRIGGER update_ai_models_updated_at
     BEFORE UPDATE ON ai_models
     FOR EACH ROW
     EXECUTE FUNCTION update_ai_models_updated_at();
   
   -- 启用行级安全策略
   ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
   ALTER TABLE bot_events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE bot_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE keyword_replies ENABLE ROW LEVEL SECURITY;
   ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE auth_keys ENABLE ROW LEVEL SECURITY;
   ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
   ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE temp_images ENABLE ROW LEVEL SECURITY;
   ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
   
   -- 创建行级安全策略
   -- Bots 表策略
   CREATE POLICY "Users can view their own bots"
     ON bots
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can create their own bots"
     ON bots
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can update their own bots"
     ON bots
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can delete their own bots"
     ON bots
     FOR DELETE
     USING (auth.uid() = user_id);
   
   -- Bot Events 表策略
   CREATE POLICY "Users can view events for their bots"
     ON bot_events
     FOR SELECT
     USING (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_events.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   CREATE POLICY "Users can create events for their bots"
     ON bot_events
     FOR INSERT
     WITH CHECK (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_events.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   -- Bot Messages 表策略
   CREATE POLICY "Users can view messages for their bots"
     ON bot_messages
     FOR SELECT
     USING (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_messages.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   CREATE POLICY "Users can insert messages for their bots"
     ON bot_messages
     FOR INSERT
     WITH CHECK (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_messages.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   -- Bot Profiles 表策略
   CREATE POLICY "Users can view profiles for their bots"
     ON bot_profiles
     FOR SELECT
     USING (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_profiles.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   CREATE POLICY "Users can insert profiles for their bots"
     ON bot_profiles
     FOR INSERT
     WITH CHECK (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_profiles.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   CREATE POLICY "Users can update profiles for their bots"
     ON bot_profiles
     FOR UPDATE
     USING (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_profiles.bot_id
       AND bots.user_id = auth.uid()
     ))
     WITH CHECK (EXISTS (
       SELECT 1 FROM bots
       WHERE bots.id = bot_profiles.bot_id
       AND bots.user_id = auth.uid()
     ));
   
   -- Keyword Replies 表策略
   CREATE POLICY "Users can view their own keyword replies"
     ON keyword_replies
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can create their own keyword replies"
     ON keyword_replies
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can update their own keyword replies"
     ON keyword_replies
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can delete their own keyword replies"
     ON keyword_replies
     FOR DELETE
     USING (auth.uid() = user_id);
   
   -- Plugins 表策略
   CREATE POLICY "Users can view their own plugins"
     ON plugins
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can create their own plugins"
     ON plugins
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can update their own plugins"
     ON plugins
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can delete their own plugins"
     ON plugins
     FOR DELETE
     USING (auth.uid() = user_id);
   
   -- AI Models 表策略
   CREATE POLICY "用户可以查看自己的AI模型配置"
     ON ai_models
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "用户可以创建自己的AI模型配置"
     ON ai_models
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "用户可以更新自己的AI模型配置"
     ON ai_models
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "用户可以删除自己的AI模型配置"
     ON ai_models
     FOR DELETE
     USING (auth.uid() = user_id);
   
   -- AI Configs 表策略
   CREATE POLICY "用户可以查看自己的AI配置"
     ON ai_configs
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "用户可以创建自己的AI配置"
     ON ai_configs
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "用户可以更新自己的AI配置"
     ON ai_configs
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "用户可以删除自己的AI配置"
     ON ai_configs
     FOR DELETE
     USING (auth.uid() = user_id);
   
   -- Auth Keys 表策略
   CREATE POLICY "用户可以管理自己的授权密钥"
     ON auth_keys
     FOR ALL
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   
   -- Friends 表策略
   CREATE POLICY "用户只能查看自己的好友"
     ON friends
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "用户只能管理自己的好友"
     ON friends
     FOR ALL
     USING (auth.uid() = user_id);
   
   -- Moments 表策略
   CREATE POLICY "用户只能查看自己的朋友圈"
     ON moments
     FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "用户只能管理自己的朋友圈"
     ON moments
     FOR ALL
     USING (auth.uid() = user_id);
   
   -- Temp Images 表策略
   CREATE POLICY "Allow all access to temp_images"
     ON temp_images
     FOR ALL
     USING (true)
     WITH CHECK (true);
   
   -- System Settings 表策略
   CREATE POLICY "Users can manage system settings"
     ON system_settings
     FOR ALL
     USING (true)
     WITH CHECK (true);
   
   -- 创建索引
   CREATE INDEX IF NOT EXISTS bots_user_id_idx ON bots(user_id);
   CREATE INDEX IF NOT EXISTS bots_created_at_idx ON bots(created_at DESC);
   CREATE INDEX IF NOT EXISTS bots_status_idx ON bots(status);
   CREATE INDEX IF NOT EXISTS bot_events_bot_id_idx ON bot_events(bot_id);
   CREATE INDEX IF NOT EXISTS bot_events_created_at_idx ON bot_events(created_at DESC);
   CREATE INDEX IF NOT EXISTS bot_messages_bot_id_idx ON bot_messages(bot_id);
   CREATE INDEX IF NOT EXISTS bot_messages_created_at_idx ON bot_messages(created_at DESC);
   CREATE INDEX IF NOT EXISTS bot_profiles_bot_id_idx ON bot_profiles(bot_id);
   CREATE INDEX IF NOT EXISTS keyword_replies_user_id_idx ON keyword_replies(user_id);
   CREATE INDEX IF NOT EXISTS plugins_user_id_idx ON plugins(user_id);
   CREATE INDEX IF NOT EXISTS idx_ai_models_user_id ON ai_models(user_id);
   CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_configs(user_id);
   CREATE INDEX IF NOT EXISTS idx_auth_keys_user_id ON auth_keys(user_id);
   CREATE INDEX IF NOT EXISTS friends_user_id_idx ON friends(user_id);
   
   -- 创建初始管理员用户
   INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'admin@example.com',
     '{"role":"admin"}',
     now(),
     now()
   );
   ```

3. **点击 "Run" 执行 SQL 脚本**

4. **设置 Supabase 认证**
   - 在 Supabase 控制台中，进入 "Authentication" > "Settings"
   - 启用 "Email" 认证方式
   - 可选：禁用邮箱确认要求（开发环境）

#### 3. 部署后端服务器（可选）

如果你需要完整的 WebSocket 功能，需要单独部署后端服务：

1. **选择服务器提供商**
   - [Railway](https://railway.app/)
   - [Render](https://render.com/)
   - [DigitalOcean](https://www.digitalocean.com/)
   - 或任何支持 Node.js 的服务器

2. **部署后端代码**
   ```bash
   cd server
   npm install
   node wss-service.js
   ```

3. **配置环境变量**
   在服务器上设置以下环境变量：
   ```
   VITE_SUPABASE_URL=你的Supabase项目URL
   VITE_SUPABASE_ANON_KEY=你的Supabase_anon_public_Key
   SUPABASE_SERVICE_ROLE_KEY=你的SUPABASE_SERVICE_ROLE_KEY
   ```

4. **更新前端配置**
   在 Vercel 项目设置中，更新以下环境变量：
   ```
   VITE_API_BASE_URL=你的后端服务URL
   VITE_WS_BASE_URL=你的WebSocket服务URL
   ```

### 方案二：本地部署

#### 1. 注册 Supabase
1.  访问 [Supabase 官网](https://supabase.io/)
2.  点击 "Start your project" 按钮
3.  注册一个新账户或使用现有账户登录
4.  创建一个新的项目，填写项目名称并**妥善保管数据库密码**
5.  项目创建完成后，在项目设置的 API 部分，记下项目的 **URL** 和 **anon public Key**

#### 2. 导入数据库
1.  在 Supabase 控制台中，进入您创建的项目
2.  在左侧导航栏中，选择 "SQL Editor" (SQL 编辑器)
3.  点击 "+ New query"
4.  复制上面的 SQL 脚本并执行
5.  检查表和数据是否已成功导入

#### 3. 部署后端 (`/server`)
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

#### 4. 部署前端

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
