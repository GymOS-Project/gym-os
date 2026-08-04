create table if not exists admin_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  plan_code text not null check (plan_code in ('starter', 'growth', 'scale')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  status text not null check (status in ('trialing', 'active', 'pending_payment', 'past_due', 'expired', 'cancelled')),
  trial_starts_at timestamptz null,
  trial_ends_at timestamptz null,
  current_period_starts_at timestamptz null,
  current_period_ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_subscriptions_admin_id on admin_subscriptions(admin_id);

create table if not exists billing_signup_drafts (
  id uuid primary key,
  auth_email text not null,
  encrypted_password text not null,
  gym_type text not null check (gym_type in ('single', 'branch')),
  plan_code text not null check (plan_code in ('starter', 'growth', 'scale')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'completed', 'cancelled', 'expired')),
  signup_payload jsonb not null,
  photo_urls text[] not null default '{}',
  admin_id uuid null references admins(id) on delete set null,
  cashfree_link_id text null,
  cashfree_cf_link_id text null,
  cashfree_transaction_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_payments (
  id uuid primary key default gen_random_uuid(),
  signup_draft_id uuid null references billing_signup_drafts(id) on delete set null,
  admin_id uuid null references admins(id) on delete set null,
  plan_code text not null check (plan_code in ('starter', 'growth', 'scale')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  amount numeric(10,2) not null,
  status text not null,
  cashfree_link_id text null,
  cashfree_cf_link_id text null,
  cashfree_order_id text null,
  cashfree_transaction_id text null,
  raw_payload jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_payments_signup_draft_id on billing_payments(signup_draft_id);
create index if not exists idx_billing_payments_admin_id on billing_payments(admin_id);
