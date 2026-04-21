import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function LoyaltyPage() {
  const { profile, refreshProfile } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveBalance, setLiveBalance] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    // Load both history and live balance from DB
    Promise.all([
      supabase.from('loyalty_points').select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('loyalty_points_balance').eq('id', profile.id).single(),
    ]).then(([{ data: hist }, { data: prof }]) => {
      setHistory(hist || [])
      setLiveBalance(prof?.loyalty_points_balance || 0)
      setLoading(false)
    })
    // Refresh auth profile too
    if (refreshProfile) refreshProfile()
  }, [profile?.id])

  const balance = liveBalance !== null ? liveBalance : (profile?.loyalty_points_balance || 0)
  const cashValue = Math.floor(balance / 10)

  return (
    <div className="page" style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">🏆 Loyalty Points</h1></div>

      {/* Balance card */}
      <div style={{ background: 'linear-gradient(135deg, #0D1117, #1a2744)', borderRadius: 16, padding: '28px 24px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Your balance</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, color: '#00C566' }}>{balance.toLocaleString()}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>points · worth KES {cashValue}</div>
        <div style={{ marginTop: 16, background: 'rgba(0,197,102,0.15)', borderRadius: 8, padding: '8px 16px', display: 'inline-block' }}>
          <span style={{ fontSize: 13, color: '#00C566', fontWeight: 600 }}>Earn 1 point per KES 100 spent</span>
        </div>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>How it works</div>
        {[
          ['🛒', 'Place an order', 'Earn 1 point for every KES 100 spent'],
          ['⭐', 'Leave a review', 'Points are awarded after you rate your order'],
          ['💳', 'Redeem at checkout', '100 points = KES 10 discount on your next order'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Points history</div>
        {loading ? <div style={{ display: 'flex', gap: 8 }}><div className="spinner"/>Loading...</div>
        : history.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No points yet — place an order to start earning!</div>
        : history.map(h => (
          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{h.description}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleDateString()}</div>
            </div>
            <span style={{ fontWeight: 700, color: h.type === 'earn' || h.type === 'bonus' ? 'var(--poa-green-dark)' : '#DC2626' }}>
              {h.type === 'earn' || h.type === 'bonus' ? '+' : '-'}{Math.abs(h.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
