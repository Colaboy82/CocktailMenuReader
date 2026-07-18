-- ============================================================
-- Spirit Note — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Global cocktail cache (public read, server-only write)
create table if not exists cocktail_cache (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_key      text not null unique,   -- normalized: lower(), trim()
  style         text,
  taste         text,
  strength      text,
  similar_drinks text[],
  created_at    timestamptz default now(),
  hit_count     int default 0
);

-- 2. User scans (one row per scan session)
create table if not exists user_scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scanned_at    timestamptz default now(),
  summary       text,
  bar_name      text,
  raw_ocr_text  text,
  items         jsonb,
  bottle_mentions jsonb
);

-- 3. User cocktail ratings (1–5 stars, one per user per cocktail name)
create table if not exists user_ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  cocktail_name text not null,
  stars         int not null check (stars between 1 and 5),
  scan_id       uuid references user_scans(id) on delete set null,
  rated_at      timestamptz default now(),
  unique (user_id, cocktail_name)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table cocktail_cache enable row level security;
alter table user_scans enable row level security;
alter table user_ratings enable row level security;

-- cocktail_cache: anyone can read, only service role can write (no user policy needed for insert/update)
create policy "Public read cocktail cache"
  on cocktail_cache for select
  using (true);

-- user_scans: users can only see and write their own rows
create policy "Users manage own scans"
  on user_scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_ratings: users can only see and write their own rows
create policy "Users manage own ratings"
  on user_ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_cocktail_cache_name_key on cocktail_cache(name_key);
create index if not exists idx_user_scans_user_id on user_scans(user_id);
create index if not exists idx_user_ratings_user_id on user_ratings(user_id);
