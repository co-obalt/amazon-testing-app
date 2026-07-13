-- ====================================================
-- MIGRATION: Add platform column to profiles table
-- Run this directly inside the Supabase SQL Editor
-- ====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform TEXT;
