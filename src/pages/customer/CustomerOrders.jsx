import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import { Package, RefreshCw, RotateCcw, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CustomerOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const { profile }           = useAuth()
  const navigate              = useNavigate()
  const channelRef            = useRef(null)

  const fetchOrders = async (id) => {
    const { data } = await supabase.from('orders')
      .select('*, vendors(name,category), order_items(name,quantity,price,menu_item_id)')
      .eq('customer_id', id).order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!profile?.id) return
    fetchOrders(profile.id)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`cust-orders-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${profile.id}` },
        () => fetchOrders(profile.id)).subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [profile?.id])

  const cancelOrder = async (order) => {
    const mins = (Date.now() - new Date(order.created_at).getTime()) / 60000
    if (mins > 2) { toast.error('Orders can only be cancelled within 2 minutes of placing'); return }
    if (!confirm('Cancel this order?')) return
    await supabase.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', order.id)
    toast.success('Order cancelled')
    fetchOrders(profile.id)
  }

  const reorder = async (order) => {
    if (!order.order_items?.length) { toast.error('No items to reorder'); return }
    // Verify vendor still exists and is open
    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', order.vendor_id).single()
    if (!vendor) { toast.error('Restaurant no longer available'); return }
    // Rebuild cart
    const cartItems = order.order_items.map(i => ({
      id: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity
    }))
    localStorage.setItem('poa_cart', JSON.stringify({ vendor, items: cartItems }))
    toast.success('Cart restored! Review and checkout 🛒')
    navigate('/customer/checkout')
  }

  const STATUS_BADGE = {
    pending:'badge-yellow', confirmed:'badge-blue', preparing:'badge-blue',
    ready:'badge-green', assigned:'badge-blue', picked_up:'badge-orange',
    in_transit:'badge-orange', delivered:'badge-green', cancelled:'badge-red',
  }
  const ACTIVE = ['pending','confirmed','preparing','ready','assigned','picked_up','in_transit']
  const canCancel = (o) => o.status === 'pending' && (Date.now() - new Date(o.created_at).getTime()) < 120000

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">My Orders</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{orders.length} total</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => profile && fetchOrders(profile.id)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? <div style={{ display:'flex', gap:8 }}><div className="spinner"/>Loading...</div>
      : orders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p style={{ fontWeight:600, marginTop:12 }}>No orders yet</p>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/customer')}>Browse restaurants</button>
        </div>
      ) : orders.map(order => (
        <div key={order.id} className="card" style={{ marginBottom:12, cursor:'pointer', borderLeft:`4px solid ${order.status==='delivered'?'var(--poa-green)':ACTIVE.includes(order.status)?'var(--poa-orange)':'var(--border)'}` }}
          onClick={() => navigate(`/customer/track/${order.id}`)}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:700 }}>{order.vendors?.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{order.order_number} · {formatDateTime(order.created_at)}</div>
            </div>
            <span className={`badge ${STATUS_BADGE[order.status]||'badge-gray'}`} style={{ textTransform:'capitalize' }}>
              {order.status?.replace(/_/g,' ')}
            </span>
          </div>

          {/* Items preview */}
          <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>
            {order.order_items?.slice(0,2).map(i => `${i.quantity}× ${i.name}`).join(', ')}
            {order.order_items?.length > 2 && ` +${order.order_items.length - 2} more`}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontFamily:'var(--font-display)' }}>{formatCurrency(order.total_amount)}</span>
            <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
              {/* Track */}
              {ACTIVE.includes(order.status) && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/customer/track/${order.id}`)}>Track →</button>
              )}
              {/* Review */}
              {order.status === 'delivered' && !order.customer_rating && (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/customer/review/${order.id}`)}>⭐ Review</button>
              )}
              {/* Reorder */}
              {(order.status === 'delivered' || order.status === 'cancelled') && (
                <button className="btn btn-secondary btn-sm" onClick={() => reorder(order)} title="Reorder">
                  <RotateCcw size={12} /> Reorder
                </button>
              )}
              {/* Cancel */}
              {canCancel(order) && (
                <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(order)}>
                  <X size={12} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
