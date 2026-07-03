/*
# Gym Management System - Full Schema

## Summary
Creates all tables for a complete gym management system with admin auth.

## Tables
1. `admins` - Admin profile linked to auth.users
2. `package_types` - Subscription package definitions (1mo, 3mo, etc.)
3. `members` - Gym members with personal info
4. `member_packages` - Active/past member subscriptions
5. `enquiries` - Prospective member leads
6. `enquiry_followups` - Follow-up records for enquiries
7. `followups` - General, payment due, renewal follow-ups
8. `transactions` - Payment transactions
9. `reviews` - Member reviews/feedback
10. `shifts` - Shift definitions for staff

## Security
- RLS enabled on all tables
- Authenticated-only access (admin panel requires login)
- All owner checks via auth.uid()
*/

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_name text NOT NULL,
  owner_name text NOT NULL,
  phone text,
  address text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_own" ON admins;
CREATE POLICY "admins_select_own" ON admins FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_insert_own" ON admins;
CREATE POLICY "admins_insert_own" ON admins FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_update_own" ON admins;
CREATE POLICY "admins_update_own" ON admins FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_delete_own" ON admins;
CREATE POLICY "admins_delete_own" ON admins FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PACKAGE TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS package_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer, -- null = custom
  duration_days integer,   -- used for custom
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE package_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pkg_select" ON package_types;
CREATE POLICY "pkg_select" ON package_types FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = package_types.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "pkg_insert" ON package_types;
CREATE POLICY "pkg_insert" ON package_types FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = package_types.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "pkg_update" ON package_types;
CREATE POLICY "pkg_update" ON package_types FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = package_types.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = package_types.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "pkg_delete" ON package_types;
CREATE POLICY "pkg_delete" ON package_types FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = package_types.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth date,
  address text,
  photo_url text,
  emergency_contact text,
  reference_member_id uuid REFERENCES members(id),
  shift text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select" ON members;
CREATE POLICY "members_select" ON members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = members.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_insert" ON members;
CREATE POLICY "members_insert" ON members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = members.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = members.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = members.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = members.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- MEMBER PACKAGES (subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  package_type_id uuid REFERENCES package_types(id),
  package_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE member_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mp_select" ON member_packages;
CREATE POLICY "mp_select" ON member_packages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = member_packages.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "mp_insert" ON member_packages;
CREATE POLICY "mp_insert" ON member_packages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = member_packages.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "mp_update" ON member_packages;
CREATE POLICY "mp_update" ON member_packages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = member_packages.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = member_packages.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "mp_delete" ON member_packages;
CREATE POLICY "mp_delete" ON member_packages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = member_packages.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- ENQUIRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  source text,
  interest text,
  assigned_to text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'converted', 'not_interested')),
  next_followup_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enq_select" ON enquiries;
CREATE POLICY "enq_select" ON enquiries FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiries.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "enq_insert" ON enquiries;
CREATE POLICY "enq_insert" ON enquiries FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiries.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "enq_update" ON enquiries;
CREATE POLICY "enq_update" ON enquiries FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiries.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiries.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "enq_delete" ON enquiries;
CREATE POLICY "enq_delete" ON enquiries FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiries.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- ENQUIRY FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS enquiry_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  enquiry_id uuid NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  followup_date date NOT NULL DEFAULT CURRENT_DATE,
  next_followup_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'no_response')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE enquiry_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ef_select" ON enquiry_followups;
CREATE POLICY "ef_select" ON enquiry_followups FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiry_followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ef_insert" ON enquiry_followups;
CREATE POLICY "ef_insert" ON enquiry_followups FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiry_followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ef_update" ON enquiry_followups;
CREATE POLICY "ef_update" ON enquiry_followups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiry_followups.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiry_followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ef_delete" ON enquiry_followups;
CREATE POLICY "ef_delete" ON enquiry_followups FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = enquiry_followups.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- FOLLOW-UPS (general, payment due, renewal)
-- ============================================================
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('general', 'payment_due', 'renewal')),
  followup_date date NOT NULL DEFAULT CURRENT_DATE,
  next_followup_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'no_response')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fu_select" ON followups;
CREATE POLICY "fu_select" ON followups FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "fu_insert" ON followups;
CREATE POLICY "fu_insert" ON followups FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "fu_update" ON followups;
CREATE POLICY "fu_update" ON followups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = followups.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = followups.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "fu_delete" ON followups;
CREATE POLICY "fu_delete" ON followups FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = followups.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  member_package_id uuid REFERENCES member_packages(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'payment' CHECK (type IN ('payment', 'refund', 'adjustment')),
  amount numeric(10,2) NOT NULL,
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "txn_select" ON transactions;
CREATE POLICY "txn_select" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = transactions.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "txn_insert" ON transactions;
CREATE POLICY "txn_insert" ON transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = transactions.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "txn_update" ON transactions;
CREATE POLICY "txn_update" ON transactions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = transactions.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = transactions.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "txn_delete" ON transactions;
CREATE POLICY "txn_delete" ON transactions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = transactions.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rev_select" ON reviews;
CREATE POLICY "rev_select" ON reviews FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = reviews.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rev_insert" ON reviews;
CREATE POLICY "rev_insert" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = reviews.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rev_update" ON reviews;
CREATE POLICY "rev_update" ON reviews FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = reviews.admin_id AND admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = reviews.admin_id AND admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rev_delete" ON reviews;
CREATE POLICY "rev_delete" ON reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = reviews.admin_id AND admins.user_id = auth.uid())
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_admin ON members(admin_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_member ON member_packages(member_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_end_date ON member_packages(end_date);
CREATE INDEX IF NOT EXISTS idx_member_packages_status ON member_packages(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_admin ON enquiries(admin_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_followups_admin ON followups(admin_id);
CREATE INDEX IF NOT EXISTS idx_followups_type ON followups(type);
CREATE INDEX IF NOT EXISTS idx_transactions_admin ON transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
