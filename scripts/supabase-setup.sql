-- ============================================================================
-- Campus Share Hub — Supabase schema
-- Run this ONCE in your Supabase project: Dashboard -> SQL Editor -> paste -> Run.
-- Safe to re-run (uses "if not exists" / "drop policy if exists").
--
-- IMPORTANT: tables are created FIRST, then the is_admin() helper that
-- references them. Postgres validates SQL function bodies at creation time,
-- so defining is_admin() before public.profiles exists makes the whole
-- migration fail — which is the root cause of the "cannot save username" /
-- broken-RLS errors. Keep this order.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  sold_count integer not null default 0,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Case-insensitive unique usernames (requirement: usernames must be unique).
create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- listings
-- ----------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_username text not null default '',
  title text not null,
  category text not null,
  price integer not null default 0,
  image text,
  owner text not null default '',                 -- free-form contact details
  status text not null default 'available',        -- available | pending | sold
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

-- ----------------------------------------------------------------------------
-- requests  (audit trail of "I Need This" taps)
-- ----------------------------------------------------------------------------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_username text not null default '',
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- ----------------------------------------------------------------------------
-- reviews  (feedback / issues — readable ONLY by the admin)
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- ============================================================================
-- Helper: who is the super admin. Defined AFTER the tables it reads.
-- (Change the email here if the admin ever changes.)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.email from public.profiles p where p.id = auth.uid()) = 'vijaybhaskar.ch9045@gmail.com',
    (auth.jwt() ->> 'email') = 'vijaybhaskar.ch9045@gmail.com'
  );
$$;

-- Atomic helper to increment a user's sold counter.
create or replace function public.increment_sold(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set sold_count = sold_count + 1 where id = p_user_id;
end;
$$;

-- Permanently and completely delete the CURRENTLY signed-in user: all of their
-- reviews, outgoing requests, listings, their profile row, AND the underlying
-- auth.users record. Runs as security definer so it can remove the auth row
-- without ever shipping a service-role key to the browser. It only ever
-- targets auth.uid(), so a user can only delete themselves.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.reviews where user_id = uid;
  delete from public.requests where requester_id = uid;
  delete from public.listings where owner_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- ============================================================================
-- RLS policies (defined last so is_admin() already exists)
-- ============================================================================

-- profiles ------------------------------------------------------------------
-- Everyone signed in can read profiles (needed for admin user list + display).
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- A user can update their own profile; the admin can update anyone (ban/block).
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete_own_or_admin" on public.profiles;
create policy "profiles_delete_own_or_admin" on public.profiles
  for delete using (auth.uid() = id or public.is_admin());

-- listings ------------------------------------------------------------------
-- Anyone signed in can read the global feed.
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings
  for select using (auth.uid() is not null);

-- Only the owner can create a listing, and only if they are not banned.
drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings
  for insert with check (
    auth.uid() = owner_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

-- Owner can edit their listing; ANY signed-in user can update it to place a
-- request (I Need This). Admin can moderate anything.
drop policy if exists "listings_update" on public.listings;
create policy "listings_update" on public.listings
  for update using (auth.uid() is not null or public.is_admin());

-- Owner can delete their listing; admin can delete any listing.
drop policy if exists "listings_delete_own_or_admin" on public.listings;
create policy "listings_delete_own_or_admin" on public.listings
  for delete using (auth.uid() = owner_id or public.is_admin());

-- requests ------------------------------------------------------------------
-- A user can read a request if they made it, if they own the listing it
-- targets (this drives the owner's Notifications feed), or if they are admin.
drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (
    auth.uid() = requester_id
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests
  for insert with check (auth.uid() = requester_id);

-- reviews -------------------------------------------------------------------
-- Only the admin may read reviews.
drop policy if exists "reviews_select_admin" on public.reviews;
create policy "reviews_select_admin" on public.reviews
  for select using (public.is_admin());

-- Any signed-in, non-banned user may submit a review.
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );
