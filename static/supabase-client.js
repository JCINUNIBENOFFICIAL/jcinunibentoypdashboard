import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = window.SUPABASE_URL;

const supabaseKey = window.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_0kunmksX8TRkAMaVZeEcRg_BVe2B9Yv';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

window.supabase = supabase;