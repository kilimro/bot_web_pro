/*
  # Initial Database Schema

  1. Tables
    - bots: Store bot information and status
    - bot_profiles: Store detailed bot profile data
    - bot_messages: Store message history
    - bot_events: Store bot events and logs
    - keyword_replies: Store keyword-based auto-replies
    - plugins: Store custom plugins
    - ai_models: Store AI model configurations
    - ai_configs: Store AI service settings
    - auth_keys: Store authorization keys
    - friends: Store bot friend list
    - moments: Store moments/posts
    - temp_images: Store temporary image data

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create bot_profiles table
CREATE TABLE IF NOT EXISTS bot_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create bot_messages table
CREATE TABLE IF NOT EXISTS bot_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  msg_id bigint NOT NULL,
  from_user text NOT NULL,
  to_user text NOT NULL,
  msg_type integer NOT NULL,
  content text NOT NULL,
  media_url text,
  status integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  source text,
  CONSTRAINT msg_id_bot_id_key UNIQUE (msg_id, bot_id)
);

-- Create bot_events table
CREATE TABLE IF NOT EXISTS bot_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT event_type_check CHECK (event_type IN ('info', 'success', 'warning', 'error'))
);

-- Create keyword_replies table
CREATE TABLE IF NOT EXISTS keyword_replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  reply text NOT NULL,
  reply_type text NOT NULL,
  match_type text NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT reply_type_check CHECK (reply_type IN ('text', 'image', 'voice')),
  CONSTRAINT match_type_check CHECK (match_type IN ('exact', 'fuzzy', 'regex')),
  CONSTRAINT scope_check CHECK (scope IN ('all', 'private', 'group'))
);

-- Create plugins table
CREATE TABLE IF NOT EXISTS plugins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger text NOT NULL,
  code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_models table
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  at_reply_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_configs table
CREATE TABLE IF NOT EXISTS ai_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_url text NOT NULL,
  model text NOT NULL,
  api_key text NOT NULL,
  system_prompt text,
  image_base_url text,
  image_model text,
  image_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auth_keys table
CREATE TABLE IF NOT EXISTS auth_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wx_id, user_id)
);

-- Create moments table
CREATE TABLE IF NOT EXISTS moments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'image', 'video')),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'deleted')),
  publish_time timestamptz,
  image_urls text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create temp_images table
CREATE TABLE IF NOT EXISTS temp_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_data text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_images ENABLE ROW LEVEL SECURITY;

-- Create policies for bots
CREATE POLICY "Users can view their own bots" ON bots
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bots" ON bots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots" ON bots
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots" ON bots
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for bot_profiles
CREATE POLICY "Users can view profiles for their bots" ON bot_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bots WHERE bots.id = bot_profiles.bot_id AND bots.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage profiles for their bots" ON bot_profiles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bots WHERE bots.id = bot_profiles.bot_id AND bots.user_id = auth.uid()
  ));

-- Create policies for bot_messages
CREATE POLICY "Users can view messages for their bots" ON bot_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bots WHERE bots.id = bot_messages.bot_id AND bots.user_id = auth.uid()
  ));

-- Create policies for bot_events
CREATE POLICY "Users can view events for their bots" ON bot_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bots WHERE bots.id = bot_events.bot_id AND bots.user_id = auth.uid()
  ));

-- Create policies for keyword_replies
CREATE POLICY "Users can manage their own keyword replies" ON keyword_replies
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for plugins
CREATE POLICY "Users can manage their own plugins" ON plugins
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for ai_models
CREATE POLICY "Users can manage their own AI models" ON ai_models
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for ai_configs
CREATE POLICY "Users can manage their own AI configs" ON ai_configs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for auth_keys
CREATE POLICY "Users can manage their own auth keys" ON auth_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for friends
CREATE POLICY "Users can manage their own friends" ON friends
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for moments
CREATE POLICY "Users can manage their own moments" ON moments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for temp_images
CREATE POLICY "All users can manage temp images" ON temp_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS bots_user_id_idx ON bots(user_id);
CREATE INDEX IF NOT EXISTS bots_status_idx ON bots(status);
CREATE INDEX IF NOT EXISTS bot_messages_bot_id_idx ON bot_messages(bot_id);
CREATE INDEX IF NOT EXISTS bot_messages_created_at_idx ON bot_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS bot_events_bot_id_idx ON bot_events(bot_id);
CREATE INDEX IF NOT EXISTS keyword_replies_user_id_idx ON keyword_replies(user_id);
CREATE INDEX IF NOT EXISTS plugins_user_id_idx ON plugins(user_id);
CREATE INDEX IF NOT EXISTS ai_models_user_id_idx ON ai_models(user_id);
CREATE INDEX IF NOT EXISTS auth_keys_user_id_idx ON auth_keys(user_id);
CREATE INDEX IF NOT EXISTS friends_user_id_idx ON friends(user_id);
CREATE INDEX IF NOT EXISTS moments_user_id_idx ON moments(user_id);
CREATE INDEX IF NOT EXISTS temp_images_created_at_idx ON temp_images(created_at DESC);