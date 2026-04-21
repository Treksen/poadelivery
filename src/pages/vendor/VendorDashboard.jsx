import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime } from '../../utils'
import { Bell, RefreshCw, ChevronDown } from 'lucide-react'
import {
  Search,
  Star,
  Clock,
  Heart,
  Globe,
  Moon,
  Sun,
  ShoppingBag,
  Users,
  Store,
  Truck,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import toast from 'react-hot-toast'

export default function VendorDashboard() {
  const { profile }           = useAuth()
  const [vendors, setVendors] = useState([])
  const [selectedId, setSelectedId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [orders, setOrders]   = useState([])
  const [stats, setStats]     = useState({ active: 0, revenue: 0, pending: 0, todayRevenue: 0, todayOrders: 0 })
  const [loading, setLoading] = useState(true)
  const channelRef            = useRef(null)
  const { theme, toggleTheme, lang, toggleLang } = useSettings()

  // Load vendors — vendor sees only their own, admin sees all
  useEffect(() => {
    if (!profile) return
    const q = profile.role === 'admin'
      ? supabase.from('vendors').select('*').order('name')
      : supabase.from('vendors').select('*').eq('owner_id', profile.id)
    q.then(({ data }) => {
      const list = data || []
      setVendors(list)
      // Auto-select vendor's own restaurant
      if (list.length === 1) setSelectedId(list[0].id)
    })
  }, [profile])

  // Fetch orders whenever vendor selection or status filter changes
  useEffect(() => {
    fetchOrders()

    // Realtime — subscribe to all orders or specific vendor
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const chName = `vendor-dash-${selectedId}`
    let ch = supabase.channel(chName).on('postgres_changes', {
      event: '*', schema: 'public', table: 'orders',
      ...(selectedId !== 'all' ? { filter: `vendor_id=eq.${selectedId}` } : {}),
    }, () => fetchOrders()).subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [selectedId, statusFilter])

  const fetchOrders = () => {
    setLoading(true)
    let q = supabase.from('orders')
      .select('*, vendors(name), order_items(name, quantity, price)')
      .order('created_at', { ascending: false })

    if (selectedId !== 'all') q = q.eq('vendor_id', selectedId)
    if (statusFilter === 'active') q = q.not('status', 'in', '("delivered","cancelled")')

    q.then(async ({ data, error }) => {
      if (error) console.error('Orders error:', error.message)
      const list = data || []
      setOrders(list)

      // Fetch today's delivered revenue live
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const vendorFilter = selectedId !== 'all' ? [selectedId] : vendors.map(v => v.id)
      const { data: delivered } = await supabase.from('orders')
        .select('subtotal, total_amount')
        .in('vendor_id', vendorFilter.length ? vendorFilter : ['none'])
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())

      const todayRev = (delivered || []).reduce((s, o) => s + Number(o.subtotal || o.total_amount || 0), 0)

      setStats({
        pending:      list.filter(o => o.status === 'pending').length,
        active:       list.filter(o => !['delivered','cancelled'].includes(o.status)).length,
        revenue:      list.reduce((t, o) => t + Number(o.total_amount || 0), 0),
        todayRevenue: todayRev,
        todayOrders:  delivered?.length || 0,
      })
      setLoading(false)
    })
  }

  const selectedVendor = vendors.find(v => v.id === selectedId)

  const advance = async (orderId, newStatus, order) => {
    const ts = {
      confirmed: { confirmed_at: new Date().toISOString() },
      preparing: { preparing_at: new Date().toISOString() },
      ready:     { ready_at:     new Date().toISOString() },
    }
    await supabase.from('orders')
      .update({ status: newStatus, ...ts[newStatus], updated_at: new Date().toISOString() })
      .eq('id', orderId)
    const vendorName = order.vendors?.name || selectedVendor?.name || 'Restaurant'
    const msgs = {
      confirmed: { title: '✅ Order confirmed!',      msg: `${vendorName} confirmed your order.` },
      preparing: { title: '👨‍🍳 Preparing your food',  msg: `${vendorName} is preparing your order.` },
      ready:     { title: '📦 Ready for pickup!',     msg: 'Your order is ready. A rider will pick it up shortly.' },
    }
    if (msgs[newStatus]) {
      await supabase.from('notifications').insert({
        user_id: order.customer_id, type: 'order', order_id: orderId,
        title: msgs[newStatus].title, message: msgs[newStatus].msg,
      })
    }
    toast.success(`Order ${newStatus}`)
    fetchOrders()
  }

  const toggleOpen = async () => {
    if (!selectedVendor) return
    await supabase.from('vendors').update({ is_open: !selectedVendor.is_open }).eq('id', selectedVendor.id)
    setVendors(prev => prev.map(v => v.id === selectedVendor.id ? { ...v, is_open: !v.is_open } : v))
    toast.success(selectedVendor.is_open ? 'Restaurant closed' : 'Now open!')
  }

  const NEXT = {
    pending:   { label: 'Confirm order',   next: 'confirmed' },
    confirmed: { label: 'Start preparing', next: 'preparing' },
    preparing: { label: 'Mark as ready',   next: 'ready' },
  }
  const STATUS_COLOR = {
    pending: 'badge-yellow', confirmed: 'badge-blue',
    preparing: 'badge-blue', ready: 'badge-green',
    delivered: 'badge-green', cancelled: 'badge-red',
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Vendor Dashboard</h1>
        <p className="page-subtitle">Poa Delivery operations overview</p>
      </div>
      {/* Settings bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={toggleLang}
          style={{
            padding: "6px 12px",
            borderRadius: 99,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-secondary)",
          }}
        >
          <Globe size={13} /> {lang === "en" ? "SW" : "EN"}
        </button>
        <button
          onClick={toggleTheme}
          style={{
            padding: "6px 12px",
            borderRadius: 99,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-secondary)",
          }}
        >
          {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}{" "}
          {theme === "light" ? "Dark" : "Light"}
        </button>
      </div>
      {/* Stats */}
      {/* Vendor selector + status filter */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Vendor selector */}
        <select
          className="form-select"
          style={{ flex: 1, minWidth: 180 }}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="all">🏪 All Vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.is_open ? "🟢" : "🔴"}
            </option>
          ))}
        </select>

        {/* Open/close toggle — only when single vendor selected */}
        {selectedVendor && (
          <button
            onClick={toggleOpen}
            style={{
              padding: "8px 14px",
              borderRadius: 99,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              background: selectedVendor.is_open
                ? "var(--poa-green-light)"
                : "#FEE2E2",
              color: selectedVendor.is_open
                ? "var(--poa-green-dark)"
                : "#DC2626",
              whiteSpace: "nowrap",
            }}
          >
            {selectedVendor.is_open ? "🟢 Open" : "🔴 Closed"}
          </button>
        )}

        <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">
          {selectedId === "all"
            ? "All Restaurants"
            : selectedVendor?.name || "..."}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          {selectedId === "all"
            ? `${vendors.length} restaurants`
            : selectedVendor?.address}
        </p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#D97706" }}>
            {stats.pending}
          </div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active orders</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{ fontSize: 18, color: "var(--poa-green-dark)" }}
          >
            {formatCurrency(stats.todayRevenue)}
          </div>
          <div className="stat-label">Today's revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayOrders}</div>
          <div className="stat-label">Delivered today</div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["active", "Active only"],
          ["all", "All orders"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            style={{
              padding: "6px 14px",
              borderRadius: 99,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background:
                statusFilter === val
                  ? "var(--poa-green)"
                  : "var(--bg-elevated)",
              color: statusFilter === val ? "#fff" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "var(--text-muted)",
            alignSelf: "center",
          }}
        >
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Orders list */}
      {loading ? (
        <div
          style={{ display: "flex", gap: 8, alignItems: "center", padding: 20 }}
        >
          <div className="spinner" /> Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--text-muted)",
          }}
        >
          <Bell size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p style={{ fontWeight: 600 }}>No orders found</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {statusFilter === "active"
              ? "No active orders right now"
              : "No orders yet for this selection"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              className="card fade-in"
              style={{
                borderLeft: `4px solid ${order.status === "pending" ? "#F59E0B" : order.status === "ready" ? "var(--poa-green)" : "var(--border)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{order.order_number}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {formatDateTime(order.created_at)}
                    {selectedId === "all" && order.vendors && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: "var(--bg-elevated)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        {order.vendors.name}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    className={`badge ${STATUS_COLOR[order.status] || "badge-gray"}`}
                    style={{ textTransform: "capitalize" }}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                  <span
                    style={{ fontWeight: 700, color: "var(--poa-green-dark)" }}
                  >
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 8 }}>
                {order.order_items?.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      padding: "1px 0",
                    }}
                  >
                    {item.quantity}× {item.name}
                  </div>
                ))}
              </div>

              {order.delivery_notes && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--poa-orange)",
                    marginBottom: 8,
                    background: "var(--poa-orange-light)",
                    padding: "6px 10px",
                    borderRadius: 6,
                  }}
                >
                  📝 {order.delivery_notes}
                </div>
              )}

              {/* Action */}
              {order.status === "ready" ? (
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--poa-green-dark)",
                    fontWeight: 600,
                  }}
                >
                  ✅ Waiting for rider
                </span>
              ) : (
                NEXT[order.status] && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      advance(order.id, NEXT[order.status].next, order)
                    }
                  >
                    {NEXT[order.status].label}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
