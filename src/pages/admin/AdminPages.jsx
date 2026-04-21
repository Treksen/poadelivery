import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import { ShoppingBag, Truck, Store, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Admin Orders ────────────────────────────────────────────
export function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const q = supabase.from('orders').select('*, vendors(name), profiles!orders_customer_id_fkey(name)')
    const filtered = filter === 'all' ? q : q.eq('status', filter)
    filtered.order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [filter])

  const cancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return
    await supabase.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    setOrders(p => p.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    toast.success('Order cancelled')
  }

  const STATUS_BADGE = { pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-blue', ready: 'badge-green', assigned: 'badge-blue', picked_up: 'badge-orange', in_transit: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red' }
  const FILTERS = ['all', 'pending', 'in_transit', 'delivered', 'cancelled']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">All Orders</h1>
        <p className="page-subtitle">{orders.length} orders</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === f ? 'var(--poa-green)' : 'var(--bg-elevated)', color: filter === f ? '#fff' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>
      {loading ? <div className="flex items-center gap-2"><div className="spinner" /> Loading...</div>
      : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order #</th><th>Customer</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{o.order_number}</td>
                    <td style={{ fontSize: 13 }}>{o.profiles?.name}</td>
                    <td style={{ fontSize: 13 }}>{o.vendors?.name}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(o.total_amount)}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{statusLabel(o.status)}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(o.created_at)}</td>
                    <td>
                      {!['delivered','cancelled'].includes(o.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Admin Riders ────────────────────────────────────────────
export function AdminRiders() {
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('rider_profiles').select('*, profiles(name, email, phone, is_active)')
      .then(({ data }) => { setRiders(data || []); setLoading(false) })
  }, [])

  const toggleVerified = async (id, current) => {
    await supabase.from('rider_profiles').update({ is_verified: !current }).eq('id', id)
    setRiders(p => p.map(r => r.id === id ? { ...r, is_verified: !current } : r))
    toast.success(!current ? 'Rider verified' : 'Verification removed')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Riders</h1>
        <p className="page-subtitle">{riders.length} registered riders</p>
      </div>
      {loading ? <div className="flex items-center gap-2"><div className="spinner" /> Loading...</div>
      : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Vehicle</th><th>Status</th><th>Deliveries</th><th>Rating</th><th>Earned</th><th>Verified</th></tr></thead>
              <tbody>
                {riders.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.profiles?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.profiles?.email}</div>
                    </td>
                    <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{r.vehicle_type} {r.vehicle_plate && `· ${r.vehicle_plate}`}</td>
                    <td><span className={`badge ${r.is_online ? 'badge-green' : 'badge-gray'}`}>{r.is_online ? 'Online' : 'Offline'}</span></td>
                    <td>{r.total_deliveries}</td>
                    <td>{r.rating || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(r.total_earned)}</td>
                    <td>
                      <button onClick={() => toggleVerified(r.id, r.is_verified)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: r.is_verified ? 'var(--poa-green-light)' : 'var(--bg-elevated)', color: r.is_verified ? 'var(--poa-green-dark)' : 'var(--text-muted)' }}>
                        {r.is_verified ? '✓ Verified' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Admin Vendors ───────────────────────────────────────────
export function AdminVendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('vendors').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setVendors(data || []); setLoading(false) })
  }, [])

  const toggle = async (id, field, current) => {
    await supabase.from('vendors').update({ [field]: !current }).eq('id', id)
    setVendors(p => p.map(v => v.id === id ? { ...v, [field]: !current } : v))
    toast.success('Updated')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <p className="page-subtitle">{vendors.length} vendors</p>
      </div>
      {loading ? <div className="flex items-center gap-2"><div className="spinner" /> Loading...</div>
      : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Rating</th><th>Orders</th><th>Open</th><th>Active</th></tr></thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.address}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{v.category}</td>
                    <td>{v.rating || '—'}</td>
                    <td>{v.total_orders}</td>
                    <td><span className={`badge ${v.is_open ? 'badge-green' : 'badge-gray'}`}>{v.is_open ? 'Open' : 'Closed'}</span></td>
                    <td>
                      <button onClick={() => toggle(v.id, 'is_active', v.is_active)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: v.is_active ? 'var(--poa-green-light)' : '#FEE2E2', color: v.is_active ? 'var(--poa-green-dark)' : '#DC2626' }}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Admin Pricing ───────────────────────────────────────────
export function AdminPricing() {
  const [config, setConfig] = useState(null)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('pricing_config').select('*').eq('is_active', true).single()
      .then(({ data }) => { setConfig(data); if (data) setForm(data) })
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('pricing_config').update({
      base_fare: Number(form.base_fare),
      per_km_rate: Number(form.per_km_rate),
      min_fare: Number(form.min_fare),
      service_fee: Number(form.service_fee),
      surge_enabled: form.surge_enabled,
      surge_multiplier: Number(form.surge_multiplier),
      surge_start_hour: Number(form.surge_start_hour),
      surge_end_hour: Number(form.surge_end_hour),
    }).eq('id', config.id)
    if (error) toast.error(error.message)
    else toast.success('Pricing updated ✅')
    setSaving(false)
  }

  if (!config) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Pricing Configuration</h1>
        <p className="page-subtitle">Delivery fee calculation rules</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Base pricing</h3>
        {[['base_fare','Base fare (KES)','Charged on every order'],['per_km_rate','Per km rate (KES)','Multiplied by distance'],['min_fare','Minimum fare (KES)','Minimum delivery fee'],['service_fee','Service fee (KES)','Platform fee per order']].map(([key, label, hint]) => (
          <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input className="form-input" type="number" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700 }}>Surge pricing</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.surge_enabled || false} onChange={e => setForm(p => ({ ...p, surge_enabled: e.target.checked }))} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Enabled</span>
          </label>
        </div>
        {form.surge_enabled && (
          <>
            <div className="form-group">
              <label className="form-label">Surge multiplier</label>
              <input className="form-input" type="number" step="0.1" value={form.surge_multiplier || ''} onChange={e => setForm(p => ({ ...p, surge_multiplier: e.target.value }))} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>e.g. 1.5 = 50% more expensive during peak hours</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['surge_start_hour','Surge start hour'],['surge_end_hour','Surge end hour']].map(([key, label]) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" type="number" min="0" max="23" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--poa-orange-light)', borderRadius: 8, fontSize: 12, color: '#9A3412' }}>
              ⚡ Surge active from {form.surge_start_hour}:00 to {form.surge_end_hour}:00 Nairobi time
            </div>
          </>
        )}
      </div>

      {/* Price preview */}
      <div className="card" style={{ marginBottom: 16, background: 'var(--poa-green-light)', border: '1px solid rgba(0,197,102,0.2)' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 10, color: 'var(--poa-green-dark)' }}>Price preview — 5km order</h3>
        {[['Base fare', `KES ${form.base_fare}`], ['Distance (5km × KES ${form.per_km_rate})', `KES ${(5 * Number(form.per_km_rate)).toFixed(0)}`], ['Service fee', `KES ${form.service_fee}`], ['Normal total', `KES ${(Number(form.base_fare) + 5 * Number(form.per_km_rate) + Number(form.service_fee)).toFixed(0)}`], ...(form.surge_enabled ? [['Surge total', `KES ${((Number(form.base_fare) + 5 * Number(form.per_km_rate)) * Number(form.surge_multiplier) + Number(form.service_fee)).toFixed(0)}`]] : [])].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
            <span style={{ fontWeight: 600, color: 'var(--poa-green-dark)' }}>{v}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save pricing config'}</button>
    </div>
  )
}
