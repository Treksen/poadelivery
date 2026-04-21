import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrderTracking } from '../../hooks/useRiderTracking'
import { formatCurrency, formatDateTime, statusLabel } from '../../utils'
import { ArrowLeft, Phone, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = ['pending','confirmed','preparing','ready','assigned','picked_up','in_transit','delivered']
const STEP_LABELS = {
  pending: 'Order placed', confirmed: 'Confirmed by restaurant',
  preparing: 'Preparing your food', ready: 'Ready for pickup',
  assigned: 'Rider assigned', picked_up: 'Order picked up',
  in_transit: 'On the way to you', delivered: 'Delivered!',
}

export default function TrackOrderPage() {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const mapRef            = useRef(null)
  const mapObj            = useRef(null)
  const riderMarker       = useRef(null)
  const polylineRef       = useRef(null)
  const mapInitialized    = useRef(false)
  const [order, setOrder]    = useState(null)
  const [riderPhone, setRiderPhone] = useState(null)
  const [eta, setEta]         = useState(null)

  const { riderPos, polyline, status, riderIsOnline } = useOrderTracking(id)

  // Fetch order once
  useEffect(() => {
    supabase.from('orders')
      .select('*, vendors(name, address, lat, lng, phone), order_items(name, quantity, price)')
      .eq('id', id).single()
      .then(({ data }) => {
        setOrder(data)
        if (data?.rider_id) {
          supabase.from('profiles').select('phone').eq('id', data.rider_id).single()
            .then(({ data: p }) => setRiderPhone(p?.phone))
        }
      })
  }, [id])

  // Init Leaflet map — runs once after order loads AND mapRef is ready
  useEffect(() => {
    if (!order?.vendors || !mapRef.current || mapInitialized.current) return
    if (!window.L) { console.error('Leaflet not loaded'); return }

    mapInitialized.current = true
    const L = window.L
    const vendorLat = Number(order.vendors.lat) || -1.286
    const vendorLng = Number(order.vendors.lng) || 36.817

    // Init map
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
    map.setView([vendorLat, vendorLng], 14)
    mapObj.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Pickup marker
    L.marker([vendorLat, vendorLng], {
      icon: L.divIcon({
        html: `<div style="background:#00C566;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">R</div>`,
        className: '', iconAnchor: [16, 16],
      })
    }).addTo(map).bindPopup(`<b>${order.vendors.name}</b><br>Pickup`)

    // Dropoff marker
    if (order.dropoff_lat) {
      L.marker([Number(order.dropoff_lat), Number(order.dropoff_lng)], {
        icon: L.divIcon({
          html: `<div style="background:#EF4444;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">YOU</div>`,
          className: '', iconAnchor: [16, 16],
        })
      }).addTo(map).bindPopup('Your location')
    }

    // Rider marker (starts hidden at vendor location)
    riderMarker.current = L.marker([vendorLat, vendorLng], {
      icon: L.divIcon({
        html: `<div style="background:#00C566;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,197,102,0.25);transition:all 0.3s"></div>`,
        className: '', iconAnchor: [9, 9],
      })
    }).addTo(map)

    // Polyline for rider trail
    polylineRef.current = L.polyline([], {
      color: '#00C566', weight: 4, opacity: 0.75,
    }).addTo(map)

    // Cleanup on unmount
    return () => {
      map.remove()
      mapObj.current = null
      mapInitialized.current = false
      riderMarker.current = null
      polylineRef.current = null
    }
  }, [order])

  // Update rider marker when new position arrives
  useEffect(() => {
    if (riderPos && order?.dropoff_lat) {
      const R = 6371, dLat = (Number(order.dropoff_lat)-riderPos.lat)*Math.PI/180
      const dLng = (Number(order.dropoff_lng)-riderPos.lng)*Math.PI/180
      const a = Math.sin(dLat/2)**2 + Math.cos(riderPos.lat*Math.PI/180)*Math.cos(Number(order.dropoff_lat)*Math.PI/180)*Math.sin(dLng/2)**2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      setEta(Math.max(3, Math.round(dist * 4))) // ~15km/h average
    }
  }, [riderPos])

  useEffect(() => {
    if (!riderPos || !riderMarker.current || !mapObj.current) return
    const latlng = [Number(riderPos.lat), Number(riderPos.lng)]
    riderMarker.current.setLatLng(latlng)
    mapObj.current.panTo(latlng, { animate: true, duration: 1 })
  }, [riderPos])

  // Update polyline
  useEffect(() => {
    if (!polylineRef.current || !polyline.length) return
    polylineRef.current.setLatLngs(polyline.map(p => [Number(p.lat), Number(p.lng)]))
  }, [polyline])

  const currentStatus  = status || order?.status || 'pending'
  const currentStep    = STEPS.indexOf(currentStatus)
  const isActive       = ['assigned','picked_up','in_transit'].includes(currentStatus)
  const isDelivered    = currentStatus === 'delivered'

  if (!order) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
        <button onClick={() => navigate('/customer/orders')} className="btn-icon"><ArrowLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{order.order_number}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.vendors?.name}</div>
        </div>
        <span className={`badge ${isDelivered ? 'badge-green' : isActive ? 'badge-orange' : 'badge-gray'}`}>
          {statusLabel(currentStatus)}
        </span>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: isActive ? 300 : 220, background: 'var(--bg-elevated)' }}
      />

      {/* Rider status bar */}
      {isActive && (
        <div style={{
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
          background: riderIsOnline ? 'var(--poa-green-light)' : 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: riderIsOnline ? 'var(--poa-green)' : 'var(--text-muted)',
            animation: riderIsOnline ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: riderIsOnline ? 'var(--poa-green-dark)' : 'var(--text-muted)' }}>
            {riderIsOnline
              ? `Rider is on the way — ${polyline.length} GPS update${polyline.length !== 1 ? 's' : ''}`
              : 'Waiting for rider GPS signal...'}
          </span>
        </div>
      )}

      <div className="page">
        {/* Progress tracker */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Order progress</h3>
          <div className="tracking-steps">
            {STEPS.filter(s => s !== 'cancelled').map((step, i) => {
              const done   = i <= currentStep
              const active = i === currentStep
              const isLast = i === STEPS.filter(s => s !== 'cancelled').length - 1
              return (
                <div key={step} className="tracking-step">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={`step-dot${done ? ' done' : ''}${active ? ' active' : ''}`} />
                    {!isLast && <div className={`step-line${done ? ' done' : ''}`} style={{ height: 20 }} />}
                  </div>
                  <div style={{ paddingBottom: 4, paddingTop: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : done ? 500 : 400, color: active ? 'var(--poa-green-dark)' : done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {STEP_LABELS[step]}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order items */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Order summary</h3>
          {order.order_items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 10 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Rating */}
        {isDelivered && !order.customer_rating && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>How was your order?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Rate your experience</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={async () => {
                  await supabase.from('orders').update({ customer_rating: n }).eq('id', id)
                  toast.success('Thanks for rating! 🙏')
                  setOrder(p => ({ ...p, customer_rating: n }))
                }} style={{ fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseOver={e => e.target.style.transform = 'scale(1.2)'}
                  onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                  ⭐
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Raise dispute */}
        {(isDelivered || order.status === 'cancelled') && (
          <div style={{ marginTop:12, textAlign:'center' }}>
            <button onClick={() => navigate(`/customer/dispute/${id}`)}
              style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              Issue with this order? Raise a dispute
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
