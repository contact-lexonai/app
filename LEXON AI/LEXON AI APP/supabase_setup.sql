
-- ---------- 1. PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  lexon_id text unique default ('LX-' || substr(md5(random()::text), 1, 8)),
  interests text[] default '{}',
  profession text,
  experience text,
  age int,
  mode text default 'viewer' check (mode in ('viewer', 'creator', 'business')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists onboarding_completed boolean default false;


alter table public.profiles
  add column if not exists lexon_id text;

update public.profiles
set lexon_id = 'LX-' || substr(md5(random()::text || id::text), 1, 8)
where lexon_id is null;

alter table public.profiles
  alter column lexon_id set default ('LX-' || substr(md5(random()::text), 1, 8));

create unique index if not exists profiles_lexon_id_key on public.profiles (lexon_id);

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. CONTENT TABLES ----------
-- (courses, tools, prompts, guides, videos — same shape pattern)

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  level text,
  is_paid boolean default false,
  url text,
  thumbnail_url text,
  status text default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  url text,
  icon text,
  status text default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  content text not null,
  status text default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  content text,
  cover_url text,
  status text default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  youtube_url text,
  thumbnail_url text,
  creator_name text,
  views int default 0,
  status text default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['courses','tools','prompts','guides','videos']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format(
      'create policy "%I published are public" on public.%I for select using (status = ''published'');',
      t, t
    );

    execute format(
      'create policy "%I owner can manage" on public.%I for all using (auth.uid() = created_by) with check (auth.uid() = created_by);',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- CREATOR MONETIZATION (Free Trial + Paid Video Listing)
-- ============================================================

-- Tracks the ONE free trial per phone number, so the same number
-- can never claim a second free trial.
create table if not exists public.creator_trials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  name text not null,
  phone text not null unique,
  email text not null,
  trial_started_at timestamptz default now(),
  trial_expires_at timestamptz default (now() + interval '30 days'),
  videos_used int default 0,
  video_limit int default 7,
  status text default 'active' check (status in ('active', 'expired', 'converted')),
  created_at timestamptz default now()
);

alter table public.creator_trials enable row level security;

create policy "Trial owner can view" on public.creator_trials
  for select using (auth.uid() = profile_id);

create policy "Trial owner can insert" on public.creator_trials
  for insert with check (auth.uid() = profile_id);

create policy "Trial owner can update own trial" on public.creator_trials
  for update using (auth.uid() = profile_id);

-- Extra columns on videos: who listed it, is it a trial listing,
-- and paid-listing/analytics fields (views/ranking/promotion).
alter table public.videos
  add column if not exists creator_phone text,
  add column if not exists is_trial_listing boolean default false,
  add column if not exists is_paid_listing boolean default false,
  add column if not exists ranking_score numeric default 0,
  add column if not exists is_promoted boolean default false;

-- Business subscription plans
create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.profiles(id),
  plan text not null check (plan in ('starter', 'growth', 'scale')),
  price_inr numeric not null,
  status text default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz default now(),
  renews_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table public.business_subscriptions enable row level security;

create policy "Business owner can view own subscription" on public.business_subscriptions
  for select using (auth.uid() = business_id);

create policy "Business owner can insert own subscription" on public.business_subscriptions
  for insert with check (auth.uid() = business_id);

create policy "Business owner can update own subscription" on public.business_subscriptions
  for update using (auth.uid() = business_id);


insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;


create policy "Avatar images are publicly viewable"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- CONTACT & SUPPORT
-- ============================================================
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz default now()
);

alter table public.support_messages enable row level security;

-- Users can send a message and see only their own — never anyone else's.
create policy "Users can send support messages" on public.support_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can view their own support messages" on public.support_messages
  for select using (auth.uid() = user_id);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id), -- null = broadcast to all users
  category text default 'updates' check (category in ('courses','tools','prompts','videos','guides','updates')),
  title text not null,
  description text,
  link_url text,
  created_at timestamptz default now()
);

create table if not exists public.notification_reads (
  notification_id uuid references public.notifications(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (notification_id, user_id)
);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Everyone can see broadcast notifications (recipient_id is null) or
-- ones addressed specifically to them — never anyone else's targeted ones.
create policy "Users can view their notifications" on public.notifications
  for select using (recipient_id is null or recipient_id = auth.uid());

create policy "Users manage their own read receipts" on public.notification_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


alter table public.profiles add column if not exists is_admin boolean default false;

create policy "Admins can create notifications" on public.notifications
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );


do $$
declare
  t text;
begin
  foreach t in array array['courses','tools','prompts','guides','videos']
  loop
    execute format(
      'create policy "%I admin full access" on public.%I for all using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)) with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));',
      t, t
    );
  end loop;
end $$;
