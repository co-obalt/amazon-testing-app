-- Migration: Add Restricted Admin and Assignments Table
-- Execute this SQL query in your Supabase SQL Editor:

ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_assigned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(admin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_assigned_users_admin ON admin_assigned_users(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_assigned_users_user ON admin_assigned_users(user_id);
