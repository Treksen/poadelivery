import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRiderTracking } from '../../hooks/useRiderTracking'
import { formatCurrency } from '../../utils'
import { MapPin, Navigation, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const FLOW = [
  { status: 'assigned',   label: 'Head to restaurant',  next: 'picked_up',  action: 'Confirm pickup' },
  { status: 'picked_up',  label: 'Deliver to customer', next: 'in_transit', action: 'Start delivery' },
  { status: 'in_transit', label: 'Almost there...',     next: 'delivered',  action: 'Confirm delivery' },
  { status: 'delivered',  label: 'Delivered!',          next: null,         action: null },
]

export default function RiderActiveOrder() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { profile }     = useAuth()
  const mapRef          = useRef(null)
  const mapObj          = useRef(null)
  const riderMarkerRef  = useRef(null)
  const polylineRef     = useRef(null)
  const mapReady        = useRef(false)
  const [order, setOrder] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Auto-start GPS tracking when order is in_transit
  const isInTransit = order?.status === 'in_transit'
  const { isTracking, polyline, currentPos, pingCount, error, startTracking } =
    useRiderTracking(id, isInTransit)

  // Fetch order
  useEffect(() => {
    supabase.from('orders')
      .select('*, vendors(name, address, lat, lng, phone), order_items(name, quantity, price)')
      .eq('id', id).single()
      .then(({ data }) => setOrder(data))
  }, [id])

  // Init Leaflet map once order is loaded
  useEffect(() => {
    if (!mapRef.current || !order || mapReady.current) return
    if (!window.L) return
    mapReady.current = true
    const L = window.L

    const vendorLat = Number(order.vendors?.lat) || -1.286
    const vendorLng = Number(order.vendors?.lng) || 36.817

    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([vendorLat, vendorLng], 14)
    mapObj.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(map)

    // Pickup marker
    if (order.vendors?.lat) {
      L.marker([vendorLat, vendorLng], {
        icon: L.divIcon({
          html: `<div style="background:#00C566;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📦</div>`,
          className: '', iconAnchor: [17, 17],
        })
      }).addTo(map).bindPopup(`Pickup: ${order.vendors.name}`)
    }

    // Dropoff marker
    if (order.dropoff_lat) {
      L.marker([Number(order.dropoff_lat), Number(order.dropoff_lng)], {
        icon: L.divIcon({
          html: `<div style="background:#EF4444;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏠</div>`,
          className: '', iconAnchor: [17, 17],
        })
      }).addTo(map).bindPopup('Dropoff')
    }

    // Rider marker (starts at vendor location)
    riderMarkerRef.current = L.marker([vendorLat, vendorLng], {
      icon: L.divIcon({
        html: `<div style="background:#3B82F6;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.2)">🏍️</div>`,
        className: '', iconAnchor: [17, 17],
      })
    }).addTo(map).bindPopup('You')

    // Polyline layer for the GPS trail
    polylineRef.current = L.polyline([], {
      color: '#3B82F6', weight: 4, opacity: 0.8,
      dashArray: null,
    }).addTo(map)

    // Draw dotted line from pickup to dropoff as route guide
    if (order.vendors?.lat && order.dropoff_lat) {
      L.polyline([
        [vendorLat, vendorLng],
        [Number(order.dropoff_lat), Number(order.dropoff_lng)],
      ], { color: '#9CA3AF', weight: 2, dashArray: '6 6', opacity: 0.5 }).addTo(map)
    }

    return () => {
      map.remove()
      mapObj.current = null
      mapReady.current = false
    }
  }, [order])

  // Update rider marker and polyline as GPS updates come in
  useEffect(() => {
    if (!currentPos || !mapObj.current) return
    const latlng = [currentPos.lat, currentPos.lng]
    riderMarkerRef.current?.setLatLng(latlng)
    mapObj.current.panTo(latlng, { animate: true, duration: 0.5 })
  }, [currentPos])

  useEffect(() => {
    if (!polylineRef.current || !polyline.length) return
    const path = polyline.map(p => [Number(p.lat), Number(p.lng)])
    polylineRef.current.setLatLngs(path)
  }, [polyline])

  const advanceStatus = async () => {
    const step = FLOW.find(f => f.status === order.status)
    if (!step?.next) return
    setUpdating(true)

    const update = { status: step.next, updated_at: new Date().toISOString() }
    if (step.next === 'in_transit') update.picked_up_at = new Date().toISOString()
    if (step.next === 'delivered')  update.delivered_at = new Date().toISOString()

    await supabase.from('orders').update(update).eq('id', id)

    // On delivery: DB trigger handles earnings sync automatically
    // But also update rider profile optimistically for instant UI refresh
    if (step.next === 'delivered' && profile?.id) {
      const { data: rp } = await supabase.from('rider_profiles').select('total_deliveries, total_earned').eq('id', profile.id).single()
      await supabase.from('rider_profiles').update({
        total_deliveries: (rp?.total_deliveries || 0) + 1,
        total_earned:     (Number(rp?.total_earned) || 0) + Number(order.delivery_fee || 0),
        is_online:        true,
        last_seen_at:     new Date().toISOString(),
      }).eq('id', profile.id)
    }

    // Notify customer
    const notifMap = {
      picked_up:  { title: '📦 Order picked up',       msg: 'Your order is on its way!' },
      in_transit: { title: '🏍️ Rider is on the way!',  msg: 'Your order has been picked up and is heading to you.' },
      delivered:  { title: '✅ Order delivered!',       msg: 'Your order has arrived. Enjoy your meal!' },
    }
    if (notifMap[step.next]) {
      await supabase.from('notifications').insert({
        user_id:  order.customer_id,
        title:    notifMap[step.next].title,
        message:  notifMap[step.next].msg,
        type:     'order',
        order_id: id,
      })
    }

    setOrder(p => ({ ...p, status: step.next }))
    toast.success(step.next === 'delivered' ? 'Order completed! 🎉' : 'Status updated')

    if (step.next === 'delivered') {
      setTimeout(() => navigate('/rider'), 1500)
    }
    setUpdating(false)
  }

  const currentStep = FLOW.find(f => f.status === order?.status)

  if (!order) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      {/* Map */}
      <div ref={mapRef} style={{ width: '100%', height: 'min(280px, 35vh)', background: 'var(--bg-elevated)' }} />

      {/* Tracking status bar */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: isTracking ? 'var(--poa-green-light)' : isInTransit ? '#EFF6FF' : 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isTracking && <div className="pulse-dot" />}
          <span style={{ fontSize: 12, fontWeight: 600, color: isTracking ? 'var(--poa-green-dark)' : '#1E40AF' }}>
            {isTracking
              ? `🛰️ GPS active — ${pingCount} ping${pingCount !== 1 ? 's' : ''} sent (every 20s)`
              : order.status === 'in_transit'
                ? '📡 Starting GPS...'
                : order.status === 'delivered'
                  ? '✅ Delivery complete'
                  : '📍 GPS tracking starts when you begin delivery'}
          </span>
        </div>
        {!isTracking && order.status === 'in_transit' && (
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: '#fff', border: 'none' }} onClick={startTracking}>
            Start GPS
          </button>
        )}
        {isTracking && currentPos && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '8px 16px', background: '#FEE2E2', fontSize: 12, color: '#DC2626' }}>
          ⚠️ GPS: {error} — tracking may be limited
        </div>
      )}

      <div className="page">
        {/* Current task banner */}
        {currentStep && currentStep.label !== 'Delivered!' && (
          <div style={{ background: 'var(--poa-dark)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current task</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>{currentStep.label}</div>
            </div>
            <Navigation size={26} style={{ color: 'var(--poa-green)' }} />
          </div>
        )}

        {/* Pickup + Dropoff */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 8, background: 'var(--poa-green)', borderRadius: 4, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pickup</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{order.vendors?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{order.vendors?.address}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 8, background: '#EF4444', borderRadius: 4, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dropoff</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{order.dropoff_address}</div>
              {order.delivery_notes && <div style={{ fontSize: 12, color: 'var(--poa-orange)', marginTop: 4 }}>📝 {order.delivery_notes}</div>}
            </div>
          </div>
        </div>

        {/* Order items + earning */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Items</div>
          {order.order_items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--text-secondary)' }}>
              <span>{item.quantity}× {item.name}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Your delivery fee</span>
            <span style={{ color: 'var(--poa-green-dark)', fontFamily: 'var(--font-display)' }}>{formatCurrency(order.delivery_fee)}</span>
          </div>
        </div>

        {/* Action button */}
        {currentStep?.action && (
          <button className="btn btn-primary btn-full btn-lg" onClick={advanceStatus} disabled={updating}>
            <CheckCircle size={16} /> {updating ? 'Updating...' : currentStep.action}
          </button>
        )}
      </div>
    </div>
  )
}
