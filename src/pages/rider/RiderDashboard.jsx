import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils'
import { ToggleLeft, ToggleRight, MapPin, Package, BarChart2 } from 'lucide-react'
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

export default function RiderDashboard() {
  const { profile }               = useAuth()
  const navigate                  = useNavigate()
  const [isOnline, setIsOnline]   = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [activeOrder, setActiveOrder]     = useState(null)
  const [stats, setStats]         = useState({ today: 0, earned: 0 })
  const [loading, setLoading]     = useState(false)
  const { theme, toggleTheme, lang, toggleLang } = useSettings();

  useEffect(() => {
    fetchAvailableOrders()
    fetchActiveOrder()
    fetchStats()
  }, [profile])

  const fetchAvailableOrders = () => {
    supabase.from('orders').select('*, vendors(name, address, lat, lng)')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setPendingOrders(data || []))
  }

  const fetchActiveOrder = () => {
    supabase.from('orders').select('*, vendors(name, address)')
      .eq('rider_id', profile.id)
      .in('status', ['assigned','picked_up','in_transit'])
      .maybeSingle()
      .then(({ data }) => setActiveOrder(data))
  }

  const fetchStats = () => {
    const today = new Date(); today.setHours(0,0,0,0)
    supabase.from('orders').select('delivery_fee')
      .eq('rider_id', profile.id).eq('status','delivered')
      .gte('delivered_at', today.toISOString())
      .then(({ data }) => setStats({
        today: data?.length || 0,
        earned: data?.reduce((t,o) => t + Number(o.delivery_fee||0), 0) || 0,
      }))
  }

  const toggleOnline = () => {
    const next = !isOnline
    setIsOnline(next)
    if (next) { fetchAvailableOrders(); toast.success('You are now online!') }
    else toast.success('You are now offline')
  }

  const acceptOrder = async (order) => {
    setLoading(true)
    const { error } = await supabase.from('orders').update({
      rider_id: profile.id, status: 'assigned',
      assigned_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', order.id).eq('status', 'ready')

    if (error) { toast.error('Could not accept order'); setLoading(false); return }

    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      title: '🏍️ Rider assigned!',
      message: `A rider is on the way to pick up your order ${order.order_number}.`,
      type: 'order', order_id: order.id,
    })

    toast.success('Order accepted!')
    setLoading(false)
    navigate(`/rider/orders/${order.id}`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Rider Dashboard</h1>
        <p className="page-subtitle">Welcome, {profile?.name?.split(" ")[0]}</p>
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

      {/* Active order banner */}
      {activeOrder && (
        <div
          style={{
            background: "var(--poa-green)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
              }}
            >
              ACTIVE ORDER
            </div>
            <div
              style={{
                fontWeight: 800,
                color: "#fff",
                fontSize: 16,
                marginTop: 2,
              }}
            >
              {activeOrder.order_number}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                marginTop: 2,
              }}
            >
              {activeOrder.vendors?.name}
            </div>
          </div>
          <button
            className="btn"
            style={{
              background: "#fff",
              color: "var(--poa-green-dark)",
              fontWeight: 700,
            }}
            onClick={() => navigate(`/rider/orders/${activeOrder.id}`)}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Online toggle */}
      <div
        className="online-toggle"
        style={{
          marginBottom: 20,
          justifyContent: "space-between",
          background: isOnline
            ? "var(--poa-green-light)"
            : "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isOnline && <div className="pulse-dot" />}
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: isOnline
                  ? "var(--poa-green-dark)"
                  : "var(--text-primary)",
              }}
            >
              {isOnline ? "You are online" : "You are offline"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {isOnline
                ? "Accepting new orders"
                : "Go online to receive orders"}
            </div>
          </div>
        </div>
        <button
          onClick={toggleOnline}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: isOnline ? "var(--poa-green)" : "var(--text-muted)",
          }}
        >
          {isOnline ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.today}</div>
          <div className="stat-label">Today's deliveries</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{ color: "var(--poa-green-dark)", fontSize: 22 }}
          >
            {formatCurrency(stats.earned)}
          </div>
          <div className="stat-label">Earned today</div>
        </div>
      </div>

      {/* Available orders */}
      {isOnline && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>
              Available orders ({pendingOrders.length})
            </h2>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchAvailableOrders}
            >
              Refresh
            </button>
          </div>
          {pendingOrders.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--text-muted)",
              }}
            >
              <Package size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No orders available right now</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Orders appear here when restaurants mark them as ready
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div key={order.id} className="card" style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{order.vendors?.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {order.order_number}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      color: "var(--poa-green-dark)",
                      fontSize: 20,
                    }}
                  >
                    {formatCurrency(order.delivery_fee)}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    From: {order.vendors?.address}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                      marginTop: 4,
                    }}
                  >
                    <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    To: {order.dropoff_address}
                  </div>
                </div>
                {order.distance_km && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 10,
                    }}
                  >
                    📍 {Number(order.distance_km).toFixed(1)} km · ~
                    {Math.round(Number(order.distance_km) * 4)} mins
                  </div>
                )}
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => acceptOrder(order)}
                  disabled={loading}
                >
                  Accept order
                </button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
