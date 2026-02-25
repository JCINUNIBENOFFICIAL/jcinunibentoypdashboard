/**
 * JCIN TOYP 2026 Supabase API Server Setup
 * 
 * Initializes a Supabase BaaS server to handle nominations, votes, updates, results and announcements on the TOYP page
 */
import { createClient } from '@supabase/supabase-js';


const supabaseServer = createClient('https://wyjgdrmizodsosgnduda.supabase.co', 'sb_publishable_zXziuEa-QzQnMb9sZgIx7A_nnSC0CYq');

export default supabaseServer;