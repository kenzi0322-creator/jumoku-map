-- 名木・巨木管理アプリ Supabase スキーマ

-- 樹木テーブル
create table if not exists trees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  species text not null,
  latitude float8 not null,
  longitude float8 not null,
  address text not null,
  description text,
  trunk_circumference_cm integer,
  height_m real,
  age_years integer,
  designation text not null default '無指定'
    check (designation in ('国指定', '都道府県指定', '市区町村指定', '無指定')),
  source_name text
    check (source_name in ('新日本名木100選', '森の巨人たち100選', 'ユーザー投稿', 'HARDWOOD投稿')),
  cover_image_url text,
  submitted_by uuid,
  created_at timestamptz default now() not null
);

-- ユーザー投稿テーブル
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  tree_id uuid not null references trees(id) on delete cascade,
  author_name text not null,
  content text not null,
  image_url text,
  visited_at date,
  created_at timestamptz default now() not null
);

-- 樹木医評価テーブル
create table if not exists evaluations (
  id uuid default gen_random_uuid() primary key,
  tree_id uuid not null references trees(id) on delete cascade,
  evaluator_name text not null,
  health_score integer not null check (health_score between 1 and 5),
  vitality text,
  disease_notes text,
  recommendation text,
  evaluated_at date not null,
  created_at timestamptz default now() not null
);

-- RLS有効化
alter table trees enable row level security;
alter table posts enable row level security;
alter table evaluations enable row level security;

-- 全員が読み取り可能
create policy "trees_select" on trees for select using (true);
create policy "posts_select" on posts for select using (true);
create policy "evaluations_select" on evaluations for select using (true);

-- 全員が投稿可能（認証なし運用）
create policy "trees_insert" on trees for insert with check (true);
create policy "posts_insert" on posts for insert with check (true);
create policy "evaluations_insert" on evaluations for insert with check (true);

-- ===================================================
-- 既存テーブルへのマイグレーション（すでにテーブルがある場合）
-- ===================================================
alter table trees add column if not exists source_name text
  check (source_name in ('新日本名木100選', '森の巨人たち100選', 'ユーザー投稿', 'HARDWOOD投稿'));

-- サンプルデータ（source_name 付き）
insert into trees (name, species, latitude, longitude, address, description, trunk_circumference_cm, height_m, age_years, designation, source_name)
values
  ('大楠（熱海）', 'クスノキ', 35.0986, 139.0727, '静岡県熱海市', '樹齢2000年とも言われる巨木。熱海市の象徴的な存在。', 2360, 25, 2000, '国指定', 'HARDWOOD投稿'),
  ('来宮神社の大楠', 'クスノキ', 35.1052, 139.0748, '静岡県熱海市西山町', '国指定天然記念物。幹周り23.9m、樹高26m。', 2390, 26, 2000, '国指定', 'HARDWOOD投稿'),
  ('三嶋大社のキンモクセイ', 'キンモクセイ', 35.1164, 138.9161, '静岡県三島市大宮町', '国指定天然記念物。推定樹齢1200年。', 380, 8, 1200, '国指定', 'HARDWOOD投稿'),
  ('都内の公孫樹', 'イチョウ', 35.6895, 139.6917, '東京都新宿区', '黄葉が美しい大木。', 480, 35, 400, '市区町村指定', 'ユーザー投稿'),
  ('京都の楓', 'イロハカエデ', 35.0116, 135.7681, '京都府京都市東山区', '紅葉の名所として知られる古木。', 220, 18, 300, '都道府県指定', 'ユーザー投稿');

