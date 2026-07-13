-- ====================================================
-- MIGRATION: Drop unused admin login logs table
-- Run this directly inside the Supabase SQL Editor
-- ====================================================

DROP TABLE IF EXISTS admin_login_logs CASCADE;
