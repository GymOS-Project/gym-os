alter table public.billing_signup_drafts
  add column if not exists dodo_checkout_id text,
  add column if not exists dodo_payment_id text,
  add column if not exists dodo_subscription_id text;

alter table public.billing_payments
  add column if not exists provider text not null default 'dodo',
  add column if not exists dodo_checkout_id text,
  add column if not exists dodo_payment_id text,
  add column if not exists dodo_subscription_id text,
  add column if not exists dodo_product_id text,
  add column if not exists dodo_webhook_id text;

create index if not exists billing_signup_drafts_dodo_checkout_id_idx
  on public.billing_signup_drafts (dodo_checkout_id);

create index if not exists billing_payments_dodo_checkout_id_idx
  on public.billing_payments (dodo_checkout_id);

create index if not exists billing_payments_dodo_payment_id_idx
  on public.billing_payments (dodo_payment_id);

create index if not exists billing_payments_dodo_webhook_id_idx
  on public.billing_payments (dodo_webhook_id);
