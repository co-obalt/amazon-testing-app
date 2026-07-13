-- Run this script in your Supabase SQL Editor to update the products table non-destructively:

ALTER TABLE products DROP COLUMN IF EXISTS category;
ALTER TABLE products DROP COLUMN IF EXISTS difficulty;
ALTER TABLE products DROP COLUMN IF EXISTS word_limit;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
