-- ==========================================
-- SUPABASE MIGRATION SCRIPT
-- Execute this script directly inside the Supabase SQL Editor
-- ==========================================

BEGIN;

-- 0. Drop admin_audit table (unused log table)
DROP TABLE IF EXISTS admin_audit;

-- 1. Upgrade review_submissions table with platform column
ALTER TABLE review_submissions ADD COLUMN IF NOT EXISTS platform TEXT;

-- 2. Populate review_submissions platform from products before dropping platform from products
UPDATE review_submissions 
SET platform = products.platform 
FROM products 
WHERE review_submissions.product_id = products.id AND review_submissions.platform IS NULL;

-- Set default for new rows
ALTER TABLE review_submissions ALTER COLUMN platform SET DEFAULT 'Amazon';

-- 3. Remove platform column from products table
ALTER TABLE products DROP COLUMN IF EXISTS platform;

-- 4. Recreate balance RPC functions to synchronize wallet balance across all platform rows for the user

-- RPC stored procedure for atomic balance decrement on withdrawal requests (syncs to all platforms)
CREATE OR REPLACE FUNCTION decrement_platform_balance(
  target_user_id UUID,
  target_platform TEXT,
  amount_to_subtract NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  -- Get the current balance first from target platform after subtraction
  SELECT wallet_balance - amount_to_subtract INTO new_balance
  FROM platform_balances
  WHERE user_id = target_user_id AND platform = target_platform;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Platform balance record not found';
  END IF;

  IF new_balance < 0.00 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update all platforms for this user to have the same balance
  UPDATE platform_balances
  SET wallet_balance = new_balance
  WHERE user_id = target_user_id;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- RPC stored procedure for atomic user review verification progress increments (syncs balance to all platforms)
CREATE OR REPLACE FUNCTION increment_user_review_progress(
  target_user_id UUID,
  target_platform TEXT,
  payout_amount NUMERIC
) RETURNS TABLE (
  wallet_balance NUMERIC,
  current_position INT
) AS $$
DECLARE
  new_balance NUMERIC;
  new_position INT;
BEGIN
  -- 1. Increment position/review count on target platform
  UPDATE platform_balances
  SET reviews_count = reviews_count + 1,
      current_position = current_position + 1
  WHERE user_id = target_user_id AND platform = target_platform
  RETURNING platform_balances.current_position INTO new_position;

  -- 2. Update balance on ALL platforms of this user
  UPDATE platform_balances
  SET wallet_balance = wallet_balance + payout_amount
  WHERE user_id = target_user_id
  RETURNING platform_balances.wallet_balance INTO new_balance;

  RETURN QUERY SELECT new_balance, new_position;
END;
$$ LANGUAGE plpgsql;

-- RPC stored procedure for atomic balance adjustments (syncs balance to all platforms)
CREATE OR REPLACE FUNCTION adjust_platform_balance(
  target_user_id UUID,
  target_platform TEXT,
  amount_to_add NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  -- Update all platforms
  UPDATE platform_balances
  SET wallet_balance = wallet_balance + amount_to_add
  WHERE user_id = target_user_id;

  -- Retrieve the updated balance
  SELECT wallet_balance INTO new_balance
  FROM platform_balances
  WHERE user_id = target_user_id AND platform = target_platform;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop user_assigned_products unique constraint on (user_id, product_id) and make it (user_id, product_id, platform) instead
ALTER TABLE user_assigned_products DROP CONSTRAINT IF EXISTS user_assigned_products_user_id_product_id_key;
ALTER TABLE user_assigned_products ADD CONSTRAINT user_assigned_products_user_id_product_id_platform_key UNIQUE(user_id, product_id, platform);

COMMIT;
