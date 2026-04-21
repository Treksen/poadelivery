import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import { ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

export function VendorOrders() {
  const { profile } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase.from('vendors').select('id').eq('owner_id', profile.id).maybeSingle()
      .then(({ data }) => { setVendor(data); if (data) fetchOrders(data.id) })
  }, [profile, filter])

  const fetchOrders = (vendorId) => {
    const active = ['pending', 'confirmed', 'preparing', 'ready']
    const q = supabase.from('orders').select('*, order_items(name, quantity)').eq('vendor_id', vendorId)
    const filtered = filter === 'active' ? q.in('status', active) : q.eq('status', 'delivered')
    filtered.order('created_at', { ascending: false }).then(({ data }) => { setOrders(data || []); setLoading(false) })
  }

  const STATUS_BADGE = { pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-blue', ready: 'badge-green', delivered: 'badge-green', cancelled: 'badge-red' }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
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
        <div className="empty-state"><ClipboardList size={40} /><p style={{ marginTop: 12 }}>No {filter} orders</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{o.order_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(o.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{statusLabel(o.status)}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(o.total_amount)}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {o.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
              </div>
              {o.delivery_notes && <div style={{ fontSize: 12, color: 'var(--poa-orange)', marginTop: 6 }}>📝 {o.delivery_notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function VendorSettings() {
  const { profile } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', address: '', phone: '', delivery_time: 30, min_order: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.from('vendors').select('*').eq('owner_id', profile.id).maybeSingle()
      .then(({ data }) => { setVendor(data); if (data) setForm({ name: data.name, description: data.description || '', address: data.address, phone: data.phone || '', delivery_time: data.delivery_time || 30, min_order: data.min_order || 0 }) })
  }, [profile])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('vendors').update(form).eq('id', vendor.id)
    if (error) toast.error(error.message)
    else toast.success('Settings saved')
    setSaving(false)
  }

  if (!vendor) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Restaurant settings</h1>
      </div>
      <div className="card">
        {[['name','Restaurant name','text'],['description','Description','text'],['address','Address','text'],['phone','Phone number','tel'],['delivery_time','Estimated delivery time (mins)','number'],['min_order','Minimum order (KES)','number']].map(([key, label, type]) => (
          <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input className="form-input" type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
          </div>
        ))}
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
      </div>
    </div>
  )
}
