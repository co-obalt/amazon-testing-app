-- Migration: Add profile_photo column to profiles table
-- Execute this SQL query in your Supabase SQL Editor:

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo TEXT;
