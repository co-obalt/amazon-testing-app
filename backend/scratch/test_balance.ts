import { supabase } from '../src/config/supabase.js';

async function run() {
  const userId = '5a92b67d-291f-48a5-995b-08f4434a007c';
  const platform = 'Alibaba';
  const { data, error } = await supabase
    .from('platform_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();
  
  if (error) {
    console.error('Fetch Error:', error);
  } else {
    console.log('Balance Record:', data);
  }
}

run();
