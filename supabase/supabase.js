import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG — remove after fixing
console.log('=== SUPABASE ENV CHECK ===')
console.log('URL:', supabaseUrl)
console.log('KEY:', supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + '...' : 'MISSING')
console.log('=========================')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

export default supabase
