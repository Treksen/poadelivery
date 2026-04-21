import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

// Singleton — prevents "Multiple GoTrueClient instances" warning
const KEY = '__poa_supabase__'
if (!globalThis[KEY]) {
  globalThis[KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: true,
      storageKey: 'poa-auth',   // explicit key avoids clashes
    }
  })
}

export const supabase = globalThis[KEY]
export default supabase
