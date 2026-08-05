# Database Migration Guide

GymOS uses Supabase as its database and auth provider. Schema changes should be tracked as SQL migrations in this repository so every environment can be reproduced from source control.

This project does not currently ship with existing migration files. Use this guide to initialize migration tracking, create new migrations, review them, and apply them safely.

## Prerequisites

- Bun `>=1.3.14`
- Node.js `>=20.19.0`
- Supabase CLI installed locally or available through `npx supabase`
- Access to the target Supabase project
- A recent database backup before applying production migrations

Install the Supabase CLI if needed:

```sh
npm install -g supabase
```

Or run commands through `npx`:

```sh
npx supabase --version
```

## Expected Layout

After initialization, migrations should live here:

```text
supabase/
  config.toml
  migrations/
    20260805120000_create_members.sql
    20260805123000_add_member_status_index.sql
```

Migration filenames must use this format:

```text
YYYYMMDDHHMMSS_short_description.sql
```

Use lowercase words separated by underscores for the description.

## One-Time Setup

Run these commands from the repository root.

1. Initialize Supabase project files:

```sh
supabase init
```

2. Link the local repo to the remote Supabase project:

```sh
supabase link --project-ref your-project-ref
```

The project ref is the first segment of your Supabase URL. For `https://abcxyz.supabase.co`, the ref is `abcxyz`.

3. If the remote database already has schema objects, capture the current schema as a baseline migration:

```sh
supabase db dump --schema public --file supabase/migrations/20260805120000_baseline_schema.sql
```

Review the generated SQL before committing it. Remove environment-specific data, secrets, or test records if any were included.

4. Commit the Supabase config and baseline migration:

```sh
git add supabase/config.toml supabase/migrations
git commit -m "Add Supabase migration baseline"
```

## Creating A Migration

Create a new migration file:

```sh
supabase migration new add_member_last_check_in
```

Edit the generated file under `supabase/migrations/`.

Example:

```sql
alter table public.members
  add column last_check_in_at timestamptz;

create index members_last_check_in_at_idx
  on public.members (last_check_in_at);
```

Keep migrations small and focused. Prefer one feature or one schema concern per migration.

## Local Validation

Start the local Supabase stack:

```sh
supabase start
```

Reset the local database and apply all migrations from scratch:

```sh
supabase db reset
```

Then validate the app:

```sh
bun install
bun run build
bun run lint
```

If you only changed database SQL and cannot run the full app locally, at minimum run `supabase db reset` and inspect the generated local database.

## Applying Migrations To Remote Environments

Always apply migrations to lower environments before production.

1. Confirm the linked project:

```sh
supabase status
```

2. Check pending migrations:

```sh
supabase migration list
```

3. Push migrations:

```sh
supabase db push
```

4. Deploy the backend after the database is compatible with the new code:

```sh
bun run build
```

For production, take a Supabase backup before `supabase db push`.

## Data Migrations

Data migrations are allowed, but they must be safe to run once and easy to review.

Use explicit `where` clauses:

```sql
update public.members
set is_active = true
where is_active is null;
```

For large tables, avoid long blocking updates. Break changes into batches through application code or a controlled maintenance script.

## Destructive Changes

Do not drop columns, drop tables, rename columns, or tighten `not null` constraints in the same release that introduces the application change.

Use an expand-and-contract sequence:

1. Add the new nullable column or table.
2. Deploy code that writes both old and new shapes if needed.
3. Backfill existing rows.
4. Deploy code that reads only the new shape.
5. Remove the old column or table in a later release.

## Supabase Auth And Storage

The backend uses Supabase service-role access through `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not put either value in migration files.

If a feature needs storage buckets, create them in SQL when possible so environments stay consistent. Current code expects these bucket names unless overridden by environment variables:

- `gym-photos`
- `plan-pdfs`

Example bucket migration:

```sql
insert into storage.buckets (id, name, public)
values ('gym-photos', 'gym-photos', true)
on conflict (id) do nothing;
```

## Tables Used By The Server

When changing schema, search the backend for usage before editing columns or constraints:

```sh
rg 'from\("table_name"\)' apps/server/src
```

Common tables referenced by the server include:

- `admins`
- `gyms`
- `staff_accounts`
- `members`
- `member_packages`
- `package_types`
- `transactions`
- `coupons`
- `coupon_usages`
- `enquiries`
- `enquiry_followups`
- `followups`
- `invoices`
- `activity_logs`
- `attendance_logs`
- `essl_devices`
- `essl_raw_punch_logs`
- `billing_signup_drafts`
- `billing_payments`
- `admin_subscriptions`
- `shifts`
- `pt_sessions`
- `payroll_entries`

## Pull Request Checklist

Before merging a migration PR:

- The migration file is committed under `supabase/migrations/`.
- The migration has been tested with `supabase db reset`.
- Backend code has been checked for affected table and column references.
- `bun run build` passes.
- `bun run lint` passes, or the reason it was skipped is documented.
- Production-impacting migrations include a backup and rollback plan.

## Rollback Guidance

Supabase migrations are forward-only by default. Prefer fixing a bad migration with a new migration instead of editing an already-applied migration.

If a migration has not been applied anywhere shared, it may be edited before merge. Once applied to staging or production, create a follow-up migration.

For high-risk production changes, prepare a rollback SQL file outside the migration chain and attach it to the deployment notes. Do not commit secrets or production data in rollback files.
