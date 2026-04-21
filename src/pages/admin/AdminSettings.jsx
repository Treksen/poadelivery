import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { Settings, Bell, Shield, Database, RefreshCw } from 'lucide-react'

export default function AdminSettings() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ orders: 0, vendors: 0, riders: 0, customers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('vendors').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'rider'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    ]).then(([{ count: o }, { count: v }, { count: r }, { count: c }]) => {
      setStats({ orders: o || 0, vendors: v || 0, riders: r || 0, customers: c || 0 })
      setLoading(false)
    })
  }, [])

  const clearOrders = async () => {
    if (!confirm('Clear ALL orders? This cannot be undone.')) return
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    toast.success('All orders cleared')
  }

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and management</p>
      </div>

      {/* System stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Database size={16} style={{ color: 'var(--poa-green)' }} />
          <h3 style={{ fontWeight: 700 }}>Database overview</h3>
        </div>
        {loading ? <div className="spinner" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['Orders', stats.orders], ['Vendors', stats.vendors], ['Riders', stats.riders], ['Customers', stats.customers]].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Settings size={16} style={{ color: 'var(--poa-green)' }} />
          <h3 style={{ fontWeight: 700 }}>App information</h3>
        </div>
        {[['App name', 'Poa Delivery'], ['Version', '1.0.0'], ['Stack', 'React + Supabase + Leaflet.js'], ['Maps', 'OpenStreetMap (free, no API key)'], ['Distance API', 'OSRM (free routing)'], ['Mode', 'Development — mock users active']].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={16} style={{ color: 'var(--poa-green)' }} />
          <h3 style={{ fontWeight: 700 }}>Notification settings</h3>
        </div>
        {[['Order placed', 'Notify vendor + admin'], ['Order confirmed', 'Notify customer'], ['Rider assigned', 'Notify customer'], ['Order delivered', 'Notify customer']].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14 }}>{l}</span>
            <span style={{ fontSize: 12, color: 'var(--poa-green-dark)', fontWeight: 600, background: 'var(--poa-green-light)', padding: '2px 8px', borderRadius: 99 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: '#FECACA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={16} style={{ color: '#DC2626' }} />
          <h3 style={{ fontWeight: 700, color: '#DC2626' }}>Danger zone</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Clear all orders</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Permanently delete all orders and order items</div>
          </div>
          <button className="btn btn-danger" onClick={clearOrders}>Clear orders</button>
        </div>
      </div>
    </div>
  )
}
