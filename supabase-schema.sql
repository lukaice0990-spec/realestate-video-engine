-- ============================================================
-- TIREA Supabase Schema
-- Run this in Supabase SQL Editor to set up the database.
-- ============================================================

-- 客戶問卷紀錄
CREATE TABLE IF NOT EXISTS survey_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  budget TEXT,
  markets TEXT[],
  purpose TEXT,
  timeline TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 會員收藏
CREATE TABLE IF NOT EXISTS member_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- 用戶資料擴充
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE survey_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- survey_leads：僅 service role 可讀寫（管理員後台）
CREATE POLICY "Service role only" ON survey_leads
  USING (auth.role() = 'service_role');

-- member_favorites：用戶只能看自己的
CREATE POLICY "Users can view own favorites" ON member_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON member_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON member_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- profiles：用戶只能看自己的
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
