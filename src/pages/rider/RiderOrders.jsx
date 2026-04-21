import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import { Package, TrendingUp } from 'lucide-react'

export function RiderOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) return
    const activeStatuses = ['assigned', 'picked_up', 'in_transit']
    const q = supabase.from('orders').select('*, vendors(name)').eq('rider_id', profile.id)
    const filtered = filter === 'active' ? q.in('status', activeStatuses) : q.eq('status', 'delivered')
    filtered.order('created_at', { ascending: false }).then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [profile, filter])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['active', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filter === f ? 'var(--poa-green)' : 'var(--bg-elevated)', color: filter === f ? '#fff' : 'var(--text-secondary)' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="flex items-center gap-2"><div className="spinner" /> Loading...</div>
      : orders.length === 0 ? (
        <div className="empty-state"><Package size={40} /><p style={{ marginTop: 12 }}>No {filter} orders</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ cursor: 'pointer' }} onClick={() => filter === 'active' ? navigate(`/rider/orders/${o.id}`) : null}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{o.vendors?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.order_number} · {formatDateTime(o.created_at)}</div>
                </div>
                <span className={`badge ${o.status === 'delivered' ? 'badge-green' : 'badge-orange'}`}>{statusLabel(o.status)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>To: {o.dropoff_address?.slice(0, 40)}</span>
                <span style={{ fontWeight: 700, color: 'var(--poa-green-dark)' }}>{formatCurrency(o.delivery_fee)}</span>
              </div>
              {filter === 'active' && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => navigate(`/rider/orders/${o.id}`)}>Continue →</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RiderEarnings() {
  const [stats, setStats]     = useState({ today: 0, week: 0, month: 0, total: 0, deliveries: 0 })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile }           = useAuth()

  useEffect(() => {
    if (!profile?.id) return

    // Always compute live from orders — never trust stale rider_profiles cache
    supabase.from('orders')
      .select('id, order_number, delivery_fee, delivered_at, vendors(name)')
      .eq('rider_id', profile.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .then(({ data: orders }) => {
        const all = orders || []
        const now = new Date()
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
        const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7)
        const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30)

        const earn = (list) => list.reduce((s, o) => s + Number(o.delivery_fee || 0), 0)

        setStats({
          today:      earn(all.filter(o => new Date(o.delivered_at) >= todayStart)),
          week:       earn(all.filter(o => new Date(o.delivered_at) >= weekStart)),
          month:      earn(all.filter(o => new Date(o.delivered_at) >= monthStart)),
          total:      earn(all),
          deliveries: all.length,
        })
        setHistory(all.slice(0, 30))
        setLoading(false)

        // Also sync total_earned in rider_profiles so it stays accurate
        const total = earn(all)
        supabase.from('rider_profiles')
          .update({ total_earned: total, total_deliveries: all.length })
          .eq('id', profile.id).then(() => {})
      })
  }, [profile?.id])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Earnings</h1>
        <p className="page-subtitle">Calculated live from all your deliveries</p>
      </div>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          ['Today',      stats.today,      'var(--poa-green-dark)'],
          ['This week',  stats.week,       'var(--poa-green-dark)'],
          ['This month', stats.month,      'var(--poa-green-dark)'],
          ['All time',   stats.total,      'var(--poa-green-dark)'],
          ['Deliveries', stats.deliveries, 'var(--text-primary)'],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-card">
            <div className="stat-value" style={{ fontSize: typeof v === 'number' && v > 999 ? 18 : 22, color: c }}>
              {typeof v === 'number' && l !== 'Deliveries' ? formatCurrency(v) : v}
            </div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Delivery history</h3>
      {loading ? <div style={{ display:'flex', gap:8 }}><div className="spinner"/>Loading...</div>
      : history.length === 0 ? (
        <div className="empty-state"><TrendingUp size={40} /><p style={{ marginTop: 12 }}>No deliveries yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((o, i) => (
            <div key={o.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.vendors?.name || 'Delivery'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.order_number} · {formatDateTime(o.delivered_at)}</div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--poa-green-dark)', fontFamily: 'var(--font-display)' }}>
                +{formatCurrency(o.delivery_fee)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
