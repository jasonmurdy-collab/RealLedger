import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://beyrjvabvummradbgasp.supabase.co'
const supabaseKey = 'sb_publishable_c134ZrbjEDGRtx7HKobJaA_lxBuhTyb'
export const supabase = createClient(supabaseUrl, supabaseKey)