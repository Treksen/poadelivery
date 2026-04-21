import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import {
  Search,
  Star,
  Clock,
  Heart,
  Globe,
  Moon,
  Sun, ShoppingBag,
  Users,
  Store,
  Truck,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "../../hooks/useSettings";

export default function AdminDashboard() {
  const [stats, setStats]   = useState({ orders: 0, revenue: 0, customers: 0, vendors: 0, riders: 0, pending: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme, toggleTheme, lang, toggleLang } = useSettings();

  useEffect(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    Promise.all([
      supabase.from('orders').select('id, total_amount, status, created_at', { count: 'exact' }),
      supabase.from('orders').select('total_amount').eq('status', 'delivered').gte('created_at', today.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer'),
      supabase.from('vendors').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('rider_profiles').select('id', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending'),
    ]).then(([{ data: orders, count: orderCount }, { data: rev }, { count: customers }, { count: vendors }, { count: riders }, { count: pending }]) => {
      setStats({
        orders: orderCount || 0,
        revenue: rev?.reduce((t, o) => t + Number(o.total_amount), 0) || 0,
        customers: customers || 0,
        vendors: vendors || 0,
        riders: riders || 0,
        pending: pending || 0,
      })
      setRecentOrders((orders || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8))
      setLoading(false)
    })
  }, [])

  const STATUS_BADGE = { pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-blue', ready: 'badge-green', assigned: 'badge-blue', picked_up: 'badge-orange', in_transit: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red' }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
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
      
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        {[
          {
            label: "Today's revenue",
            value: formatCurrency(stats.revenue),
            icon: TrendingUp,
            color: "var(--poa-green-dark)",
          },
          { label: "Total orders", value: stats.orders, icon: ShoppingBag },
          {
            label: "Pending orders",
            value: stats.pending,
            icon: ShoppingBag,
            color: "#D97706",
          },
          { label: "Customers", value: stats.customers, icon: Users },
          { label: "Active vendors", value: stats.vendors, icon: Store },
          { label: "Riders", value: stats.riders, icon: Truck },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  className="stat-value"
                  style={color ? { color, fontSize: 22 } : { fontSize: 28 }}
                >
                  {value}
                </div>
                <div className="stat-label">{label}</div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Recent orders</h3>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="spinner" /> Loading...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>
                      {o.order_number || o.id.slice(0, 8)}
                    </td>
                    <td>
                      <span
                        className={`badge ${STATUS_BADGE[o.status] || "badge-gray"}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {formatDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
