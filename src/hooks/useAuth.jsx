import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

// Build profile directly from auth user — no DB call needed for initial load
const profileFromUser = (u) => ({
  id:    u.id,
  name:  u.user_metadata?.name  || u.email?.split('@')[0] || 'User',
  email: u.email,
  role:  u.user_metadata?.role  || 'customer',
  phone: u.user_metadata?.phone || null,
})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sync full profile from DB in background — never blocks UI
  const syncProfileFromDB = async (u) => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', u.id).maybeSingle()
      if (data) {
        setProfile(data)
        return data
      }
      // Insert if missing
      const p = profileFromUser(u)
      await supabase.from('profiles').insert(p)
      return p
    } catch (_) {
      // DB unreachable — auth metadata fallback already set, that's fine
    }
  }

  useEffect(() => {
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED and USER_UPDATED should never reset loading or re-redirect
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Just silently update the user object, nothing else
          const u = session?.user ?? null
          setUser(u)
          return
        }

        const u = session?.user ?? null
        setUser(u)

        if (u) {
          // Set profile instantly from metadata
          const p = profileFromUser(u)
          setProfile(p)

          // Only set loading=false on first init
          if (!initialized) {
            initialized = true
            setLoading(false)
          }

          // Sync from DB in background
          syncProfileFromDB(u).then(dbProfile => {
            if (dbProfile) setProfile(dbProfile)
          })

          // Auto-online for riders — only on actual sign in
          if (p.role === 'rider' && event === 'SIGNED_IN') {
            supabase.from('rider_profiles')
              .upsert({ id: u.id, is_online: true, last_seen_at: new Date().toISOString() })
              .then(() => {})
          }
        } else {
          setProfile(null)
          initialized = true
          setLoading(false)
        }
      }
    )

    // Safety net
    const t = setTimeout(() => { initialized = true; setLoading(false) }, 3000)
    return () => { clearTimeout(t); subscription.unsubscribe() }
  }, [])

  const signIn = async (email, password) => {
    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (err) {
      return { error: err }
    }
  }

  const signUp = async (email, password, metadata) => {
    try {
      return await supabase.auth.signUp({
        email, password, options: { data: metadata }
      })
    } catch (err) {
      return { error: err }
    }
  }

  const signOut = async () => {
    const wasRider = profile?.role === 'rider'
    const uid = user?.id
    setProfile(null)
    setUser(null)
    setLoading(false)
    if (wasRider && uid) {
      supabase.from('rider_profiles')
        .update({ is_online: false }).eq('id', uid).then(() => {})
    }
    supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut,
      refreshProfile: () => user && syncProfileFromDB(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}
