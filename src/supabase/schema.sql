-- ═══════════════════════════════════════════════════════════════════════════
-- NourishIQ — Supabase schema (v1: cloud sync + auth)
-- Run this whole file in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Design:
--   • One row per user per day (diary / measurements / steps) → natural
--     conflict unit for multi-device sync; last-writer-wins per day.
--   • Single-row user_settings for profile / reminders (small, LWW).
--   • Append-style chat_messages keyed by (user_id, msg_key) so devices
--     merge conversations without duplication.
--   • Row Level Security on EVERY table: a user can only ever touch rows
--     where user_id = auth.uid(). No anon access, no service role needed
--     by the app (all requests carry the user's own JWT).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── helper: keep updated_at honest ──────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── 1. user_settings (one row per user) ─────────────────────────────────────
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  passport_id   text,
  profile       jsonb   not null default '{}'::jsonb,
  seen_welcome  boolean not null default false,
  reminders     jsonb   not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_user_settings_touch on public.user_settings;
create trigger trg_user_settings_touch
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ── 2. daily_logs (food diary, one row per local date) ──────────────────────
create table if not exists public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_date    date not null,
  day         jsonb not null default '{}'::jsonb,  -- { date, meals[], waterMl }
  updated_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_daily_logs_user on public.daily_logs (user_id, log_date);

drop trigger if exists trg_daily_logs_touch on public.daily_logs;
create trigger trg_daily_logs_touch
  before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- ── 3. measurements (weight / waist, one row per local date) ────────────────
create table if not exists public.measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_date    date not null,
  weight_kg   numeric(5, 2),
  waist_cm    numeric(5, 1),
  updated_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_measurements_user on public.measurements (user_id, log_date);

drop trigger if exists trg_measurements_touch on public.measurements;
create trigger trg_measurements_touch
  before update on public.measurements
  for each row execute function public.touch_updated_at();

-- ── 4. chat_messages (AI nutritionist history, union-merged) ────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  msg_key     text not null,                       -- "ts:role" dedupe key
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, msg_key)
);

create index if not exists idx_chat_messages_user on public.chat_messages (user_id, created_at);

-- ── 5. daily_steps (Health Connect / Google Fit counts) ─────────────────────
create table if not exists public.daily_steps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_date    date not null,
  steps       integer not null default 0 check (steps >= 0),
  updated_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_daily_steps_user on public.daily_steps (user_id, log_date);

drop trigger if exists trg_daily_steps_touch on public.daily_steps;
create trigger trg_daily_steps_touch
  before update on public.daily_steps
  for each row execute function public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security — owner-only access on every table (4 policies × 5 tables)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.user_settings  enable row level security;
alter table public.daily_logs     enable row level security;
alter table public.measurements   enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.daily_steps    enable row level security;

-- user_settings ──────────────────────────────────────────────────────────────
drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.user_settings;
create policy "settings_delete_own" on public.user_settings
  for delete using (auth.uid() = user_id);

-- daily_logs ─────────────────────────────────────────────────────────────────
drop policy if exists "logs_select_own" on public.daily_logs;
create policy "logs_select_own" on public.daily_logs
  for select using (auth.uid() = user_id);

drop policy if exists "logs_insert_own" on public.daily_logs;
create policy "logs_insert_own" on public.daily_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "logs_update_own" on public.daily_logs;
create policy "logs_update_own" on public.daily_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "logs_delete_own" on public.daily_logs;
create policy "logs_delete_own" on public.daily_logs
  for delete using (auth.uid() = user_id);

-- measurements ───────────────────────────────────────────────────────────────
drop policy if exists "meas_select_own" on public.measurements;
create policy "meas_select_own" on public.measurements
  for select using (auth.uid() = user_id);

drop policy if exists "meas_insert_own" on public.measurements;
create policy "meas_insert_own" on public.measurements
  for insert with check (auth.uid() = user_id);

drop policy if exists "meas_update_own" on public.measurements;
create policy "meas_update_own" on public.measurements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meas_delete_own" on public.measurements;
create policy "meas_delete_own" on public.measurements
  for delete using (auth.uid() = user_id);

-- chat_messages ──────────────────────────────────────────────────────────────
drop policy if exists "chat_select_own" on public.chat_messages;
create policy "chat_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "chat_insert_own" on public.chat_messages;
create policy "chat_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_update_own" on public.chat_messages;
create policy "chat_update_own" on public.chat_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_delete_own" on public.chat_messages;
create policy "chat_delete_own" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- daily_steps ────────────────────────────────────────────────────────────────
drop policy if exists "steps_select_own" on public.daily_steps;
create policy "steps_select_own" on public.daily_steps
  for select using (auth.uid() = user_id);

drop policy if exists "steps_insert_own" on public.daily_steps;
create policy "steps_insert_own" on public.daily_steps
  for insert with check (auth.uid() = user_id);

drop policy if exists "steps_update_own" on public.daily_steps;
create policy "steps_update_own" on public.daily_steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "steps_delete_own" on public.daily_steps;
create policy "steps_delete_own" on public.daily_steps
  for delete using (auth.uid() = user_id);
