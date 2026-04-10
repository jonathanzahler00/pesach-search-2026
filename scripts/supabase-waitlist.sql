-- Run once in Supabase: SQL Editor → New query → Run
-- Then add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel (server-only; never NEXT_PUBLIC).

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_lower
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

-- No policies: anon/authenticated cannot read or write. API uses the service role key, which bypasses RLS.
