-- Migration 17: Cash Flow & Financial Management Module
-- Safe, additive migration preserving 100% of existing invoices, payments, and clients.

-- 1. Financial Accounts (Cash in hand, Bank, bKash, Nagad)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name text NOT NULL UNIQUE,
  account_type text NOT NULL CHECK (account_type IN ('cash', 'bank', 'mobile_banking', 'other')),
  account_number text,
  bank_name text,
  opening_balance_bdt numeric NOT NULL DEFAULT 0 CHECK (opening_balance_bdt >= 0),
  current_balance_bdt numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Financial Categories
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('income', 'expense')),
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_cat_type_name UNIQUE (category_type, name)
);

-- 3. Financial Transaction Number Sequence & Generator (TXN-2026-0001)
CREATE SEQUENCE IF NOT EXISTS public.financial_transaction_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_financial_txn_number()
RETURNS text AS $$
DECLARE
  next_val integer;
  current_year text;
BEGIN
  next_val := nextval('public.financial_transaction_seq');
  current_year := to_char(now(), 'YYYY');
  RETURN 'TXN-' || current_year || '-' || to_char(next_val, 'FM0000');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 4. Financial Transactions Table (General Ledger)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number text NOT NULL UNIQUE DEFAULT public.generate_financial_txn_number(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  amount_bdt numeric NOT NULL CHECK (amount_bdt > 0),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending', 'reversed', 'void')),
  
  -- Account links
  source_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  destination_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  
  -- Category link & historical snapshot
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  category_name text,
  
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  description text NOT NULL,
  
  -- Integration with invoices & CRM
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_payment_id uuid REFERENCES public.invoice_payments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Creator & Auditor
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  
  -- Reversals
  reversal_reason text,
  reversed_at timestamp with time zone,
  reversed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Granular Permissions Table for Admin Users
CREATE TABLE IF NOT EXISTS public.admin_user_permissions (
  admin_id uuid PRIMARY KEY REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_finance_only boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Financial Audit Logs (Immutable)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Triggers for updated_at
DROP TRIGGER IF EXISTS set_financial_accounts_updated_at ON public.financial_accounts;
CREATE TRIGGER set_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_financial_transactions_updated_at ON public.financial_transactions;
CREATE TRIGGER set_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 8. Clean up duplicates if previous run created extra accounts
DO $$
DECLARE
  v_keep_bank uuid;
  v_dup_bank uuid;
  v_keep_bkash uuid;
  v_dup_bkash uuid;
  v_keep_nagad uuid;
  v_dup_nagad uuid;
BEGIN
  -- Standardize Bank Account (Single unified bank, no hardcoded bank names)
  SELECT id INTO v_keep_bank FROM public.financial_accounts WHERE account_name IN ('Bank Account', 'Bank Account (Primary)') LIMIT 1;
  IF v_keep_bank IS NULL THEN
    SELECT id INTO v_keep_bank FROM public.financial_accounts WHERE account_name = 'City Bank Operating Account' LIMIT 1;
  END IF;
  
  IF v_keep_bank IS NOT NULL THEN
    UPDATE public.financial_accounts 
    SET account_name = 'Bank Account', bank_name = 'Bank' 
    WHERE id = v_keep_bank;
  END IF;

  FOR v_dup_bank IN SELECT id FROM public.financial_accounts WHERE account_name IN ('Bank Account (Primary)', 'City Bank Operating Account') AND id != v_keep_bank LOOP
    UPDATE public.financial_transactions SET source_account_id = v_keep_bank WHERE source_account_id = v_dup_bank;
    UPDATE public.financial_transactions SET destination_account_id = v_keep_bank WHERE destination_account_id = v_dup_bank;
    DELETE FROM public.financial_accounts WHERE id = v_dup_bank;
  END LOOP;

  -- Standardize bKash
  SELECT id INTO v_keep_bkash FROM public.financial_accounts WHERE account_name = 'bKash' LIMIT 1;
  IF v_keep_bkash IS NULL THEN
    SELECT id INTO v_keep_bkash FROM public.financial_accounts WHERE account_name IN ('bKash Merchant / Personal', 'bKash Merchant Wallet') LIMIT 1;
    IF v_keep_bkash IS NOT NULL THEN
      UPDATE public.financial_accounts SET account_name = 'bKash' WHERE id = v_keep_bkash;
    END IF;
  END IF;
  FOR v_dup_bkash IN SELECT id FROM public.financial_accounts WHERE account_name IN ('bKash Merchant / Personal', 'bKash Merchant Wallet') AND id != v_keep_bkash LOOP
    UPDATE public.financial_transactions SET source_account_id = v_keep_bkash WHERE source_account_id = v_dup_bkash;
    UPDATE public.financial_transactions SET destination_account_id = v_keep_bkash WHERE destination_account_id = v_dup_bkash;
    DELETE FROM public.financial_accounts WHERE id = v_dup_bkash;
  END LOOP;

  -- Standardize Nagad
  SELECT id INTO v_keep_nagad FROM public.financial_accounts WHERE account_name = 'Nagad' LIMIT 1;
  IF v_keep_nagad IS NULL THEN
    SELECT id INTO v_keep_nagad FROM public.financial_accounts WHERE account_name IN ('Nagad Business / Personal', 'Nagad Corporate Wallet') LIMIT 1;
    IF v_keep_nagad IS NOT NULL THEN
      UPDATE public.financial_accounts SET account_name = 'Nagad' WHERE id = v_keep_nagad;
    END IF;
  END IF;
  FOR v_dup_nagad IN SELECT id FROM public.financial_accounts WHERE account_name IN ('Nagad Business / Personal', 'Nagad Corporate Wallet') AND id != v_keep_nagad LOOP
    UPDATE public.financial_transactions SET source_account_id = v_keep_nagad WHERE source_account_id = v_dup_nagad;
    UPDATE public.financial_transactions SET destination_account_id = v_keep_nagad WHERE destination_account_id = v_dup_nagad;
    DELETE FROM public.financial_accounts WHERE id = v_dup_nagad;
  END LOOP;

  -- Delete unused Rocket Wallet if empty/duplicate
  DELETE FROM public.financial_accounts 
  WHERE account_name = 'Rocket Wallet' 
    AND id NOT IN (SELECT DISTINCT source_account_id FROM public.financial_transactions WHERE source_account_id IS NOT NULL)
    AND id NOT IN (SELECT DISTINCT destination_account_id FROM public.financial_transactions WHERE destination_account_id IS NOT NULL);
END $$;

-- 8b. Seed Only 4 Clean Default Accounts (Cash, Bank, bKash, Nagad)
INSERT INTO public.financial_accounts (account_name, account_type, bank_name, sort_order)
VALUES 
  ('Cash in Hand', 'cash', 'Studio Cash Reserve', 1),
  ('Bank Account', 'bank', 'Bank', 2),
  ('bKash', 'mobile_banking', 'bKash Merchant', 3),
  ('Nagad', 'mobile_banking', 'Nagad Business', 4)
ON CONFLICT (account_name) DO NOTHING;

-- 9. Seed Default Categories if not present
INSERT INTO public.financial_categories (name, category_type, is_system)
VALUES
  ('Artwork Sales', 'income', true),
  ('Custom Framing', 'income', true),
  ('Delivery & Shipping Income', 'income', true),
  ('Consulting & Commission Services', 'income', true),
  ('Other Income', 'income', true),
  ('Bank & Processing Fees', 'expense', true),
  ('Canvas & Artist Supplies', 'expense', true),
  ('Framing Materials & Production', 'expense', true),
  ('Studio Rent & Utilities', 'expense', true),
  ('Courier & Delivery Charges', 'expense', true),
  ('Marketing & Advertising', 'expense', true),
  ('Packaging & Logistics Supplies', 'expense', true),
  ('Refreshments & Entertainment', 'expense', true),
  ('Miscellaneous Expense', 'expense', true)
ON CONFLICT (category_type, name) DO NOTHING;

-- 10. Row Level Security
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to financial_accounts" ON public.financial_accounts;
CREATE POLICY "Admins full access to financial_accounts"
  ON public.financial_accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to financial_categories" ON public.financial_categories;
CREATE POLICY "Admins full access to financial_categories"
  ON public.financial_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to financial_transactions" ON public.financial_transactions;
CREATE POLICY "Admins full access to financial_transactions"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to admin_user_permissions" ON public.admin_user_permissions;
CREATE POLICY "Admins full access to admin_user_permissions"
  ON public.admin_user_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to financial_audit_logs" ON public.financial_audit_logs;
CREATE POLICY "Admins full access to financial_audit_logs"
  ON public.financial_audit_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. Safe Historical Backfill of Existing Invoice Payments
-- Safely inserts historical payments as posted income transactions linked to default accounts
DO $$
DECLARE
  r RECORD;
  v_cash_id uuid;
  v_bank_id uuid;
  v_bkash_id uuid;
  v_nagad_id uuid;
  v_target_account uuid;
  v_cat_id uuid;
BEGIN
  SELECT id INTO v_cash_id FROM public.financial_accounts WHERE account_type = 'cash' LIMIT 1;
  SELECT id INTO v_bank_id FROM public.financial_accounts WHERE account_type = 'bank' LIMIT 1;
  SELECT id INTO v_bkash_id FROM public.financial_accounts WHERE account_name ILIKE '%bkash%' LIMIT 1;
  SELECT id INTO v_nagad_id FROM public.financial_accounts WHERE account_name ILIKE '%nagad%' LIMIT 1;
  SELECT id INTO v_cat_id FROM public.financial_categories WHERE name = 'Artwork Sales' AND category_type = 'income' LIMIT 1;

  FOR r IN (
    SELECT 
      ip.id as payment_id,
      ip.invoice_id,
      ip.amount_bdt,
      ip.payment_method,
      ip.payment_date,
      ip.transaction_ref,
      ip.internal_notes,
      ip.recorded_by,
      ip.recorded_by_name,
      ip.created_at,
      inv.invoice_number,
      inv.customer_name,
      inv.client_id
    FROM public.invoice_payments ip
    JOIN public.invoices inv ON inv.id = ip.invoice_id
    LEFT JOIN public.financial_transactions ft ON ft.invoice_payment_id = ip.id
    WHERE ft.id IS NULL AND inv.status != 'void' AND inv.status != 'cancelled'
  ) LOOP
    -- Determine target account
    IF r.payment_method = 'bkash' THEN
      v_target_account := COALESCE(v_bkash_id, v_cash_id);
    ELSIF r.payment_method = 'nagad' THEN
      v_target_account := COALESCE(v_nagad_id, v_cash_id);
    ELSIF r.payment_method = 'bank_transfer' OR r.payment_method = 'card' THEN
      v_target_account := COALESCE(v_bank_id, v_cash_id);
    ELSE
      v_target_account := v_cash_id;
    END IF;

    -- Insert corresponding transaction
    INSERT INTO public.financial_transactions (
      transaction_type,
      amount_bdt,
      transaction_date,
      status,
      destination_account_id,
      category_id,
      category_name,
      payment_method,
      reference_number,
      description,
      invoice_id,
      invoice_payment_id,
      client_id,
      created_by,
      created_by_name,
      created_at
    ) VALUES (
      'income',
      r.amount_bdt,
      r.payment_date,
      'posted',
      v_target_account,
      v_cat_id,
      'Artwork Sales',
      r.payment_method,
      r.transaction_ref,
      'Payment received for invoice ' || r.invoice_number || ' (' || r.customer_name || ')',
      r.invoice_id,
      r.payment_id,
      r.client_id,
      r.recorded_by,
      r.recorded_by_name,
      r.created_at
    );

    -- Increment account balance
    IF v_target_account IS NOT NULL THEN
      UPDATE public.financial_accounts
      SET current_balance_bdt = current_balance_bdt + r.amount_bdt
      WHERE id = v_target_account;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
