import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) {
        if (error.message?.toLowerCase().includes('invalid')) {
          toast.error('Wrong email or password.')
        } else if (error.message?.includes('timed out')) {
          toast.error('Connection timed out. Check your internet.')
        } else {
          toast.error(error.message || 'Login failed')
        }
        return
      }
      toast.success('Welcome back!')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh)',
      background: '#0D1117',
      display: 'flex', alignItems: 'stretch',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ── Left branding panel — hidden on mobile ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }} className="auth-left-panel">
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 44, fontWeight: 800, color: '#00C566', marginBottom: 16 }}>Poa.</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.75 }}>
            Fast food delivery across Nairobi. Fresh, hot, and on time.
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['🍔 Order from your favourite restaurants', '🏍️ Track your rider live on a map', '⚡ Delivered in 35 minutes or less'].map(t => (
              <div key={t} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, display: 'flex', gap: 8 }}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 32px',
        overflowY: 'auto',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13, marginBottom: 36, width: 'fit-content', padding: 0 }}
        >
          <ArrowLeft size={14} /> Home
        </button>

        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, color: '#111' }}>
          Welcome back
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>Sign in to your Poa account</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              style={{ width: '100%', padding: '13px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                style={{ width: '100%', padding: '13px 44px 13px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: '#00C566', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6B7280' }}>
          Don't have an account?{' '}
          <button onClick={() => navigate('/signup')}
            style={{ color: '#00C566', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            Sign up
          </button>
        </p>

        {/* Role links */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 }}>Sign up as</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[['customer','🛒 Customer'],['rider','🏍️ Rider'],['vendor','🍽️ Vendor']].map(([role, label]) => (
              <button key={role} onClick={() => navigate(`/signup?role=${role}`)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
