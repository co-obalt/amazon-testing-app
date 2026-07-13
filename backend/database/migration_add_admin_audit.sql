-- ====================================================
-- MIGRATION: Create admin_audit table to log admin mutations
-- Run this directly inside the Supabase SQL Editor
-- ====================================================

CREATE TABLE IF NOT EXISTS admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance auditing
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user ON admin_audit(target_user_id);
