-- Duely database schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds business details and the billing plan
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  business_name    text,
  plan             text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  plan_renews_at   timestamptz,
  auto_chase       boolean not null default false,
  ai_credits_used  integer not null default 0,
  ai_period_start  date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients: the people / companies a user bills
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  company     text,
  created_at  timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- ---------------------------------------------------------------------------
-- invoices: line items are stored as jsonb [{description, quantity, rate}]
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  client_id            uuid not null references public.clients(id) on delete restrict,
  number               text not null,
  currency             text not null default 'INR',
  items                jsonb not null default '[]'::jsonb,
  subtotal             numeric(12,2) not null default 0,
  tax_rate             numeric(5,2) not null default 0,
  total                numeric(12,2) not null default 0,
  issue_date           date not null default current_date,
  due_date             date not null,
  status               text not null default 'sent' check (status in ('draft', 'sent', 'paid', 'void')),
  notes                text,
  public_token         uuid not null unique default gen_random_uuid(),
  razorpay_order_id    text,
  razorpay_payment_id  text,
  platform_fee         numeric(12,2) not null default 0,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  unique (user_id, number)
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_status_due_idx on public.invoices(status, due_date);

-- ---------------------------------------------------------------------------
-- reminders: every AI-drafted follow-up, and whether/how it was sent
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  tone        text not null check (tone in ('friendly', 'firm', 'final')),
  subject     text not null,
  body        text not null,
  channel     text not null default 'draft' check (channel in ('draft', 'email', 'manual', 'auto')),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reminders_invoice_idx on public.reminders(invoice_id);

-- ---------------------------------------------------------------------------
-- payments: ledger of every Razorpay payment (client invoices + subscriptions)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  invoice_id           uuid references public.invoices(id) on delete set null,
  kind                 text not null check (kind in ('invoice', 'subscription')),
  plan                 text,
  amount               numeric(12,2) not null,
  currency             text not null default 'INR',
  razorpay_order_id    text not null,
  razorpay_payment_id  text unique,
  status               text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at           timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);
create unique index if not exists payments_order_idx on public.payments(razorpay_order_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see their own rows.
-- The public payment page and webhooks use the service-role key on the server.
-- ---------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.clients   enable row level security;
alter table public.invoices  enable row level security;
alter table public.reminders enable row level security;
alter table public.payments  enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
-- Plan, credits and renewal date are only changed by the server (service role).
create policy "own profile update" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own clients" on public.clients;
create policy "own clients" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own invoices" on public.invoices;
create policy "own invoices" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own payments read" on public.payments;
create policy "own payments read" on public.payments for select using (auth.uid() = user_id);

-- Stop users from upgrading their own plan or resetting credits from the browser.
revoke update on public.profiles from authenticated;
grant update (full_name, business_name, auto_chase) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Create a profile automatically when someone signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
