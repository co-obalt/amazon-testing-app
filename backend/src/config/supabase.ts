import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
  console.warn('⚠️ WARNING: SUPABASE_URL is not configured in backend/.env. Database calls will fail.');
}
if (!supabaseKey || supabaseKey.includes('your-supabase-anon-key')) {
  console.warn('⚠️ WARNING: SUPABASE_KEY is not configured in backend/.env. Database calls will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
