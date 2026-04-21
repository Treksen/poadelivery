import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils'

export default function AdminLiveMap() {
  const mapRef    = useRef(null)
  const mapObj    = useRef(null)
  const markersRef = useRef({})
  const [riders, setRiders]   = useState([])
  const [orders, setOrders]   = useState([])

  useEffect(() => {
    loadData()
    // Refresh every 30 seconds
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
  }, [])

  const loadData = async () => {
    const [{ data: r }, { data: o }] = await Promise.all([
      supabase.from('rider_profiles').select('*, profiles(name, phone)').eq('is_online', true),
      supabase.from('orders').select('*, vendors(name,lat,lng), profiles!orders_customer_id_fkey(name)')
        .in('status', ['assigned','picked_up','in_transit']),
    ])
    setRiders(r || [])
    setOrders(o || [])
    updateMap(r || [], o || [])
  }

  useEffect(() => {
    if (!mapRef.current || mapObj.current || !window.L) return
    const L = window.L
    const map = L.map(mapRef.current).setView([-1.286, 36.817], 12)
    mapObj.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM', maxZoom:18 }).addTo(map)
  }, [])

  const updateMap = (rList, oList) => {
    if (!mapObj.current || !window.L) return
    const L = window.L
    // Update rider markers
    rList.forEach(r => {
      if (!r.current_lat) return
      const pos = [Number(r.current_lat), Number(r.current_lng)]
      if (markersRef.current[r.id]) {
        markersRef.current[r.id].setLatLng(pos)
      } else {
        markersRef.current[r.id] = L.marker(pos, {
          icon: L.divIcon({ html:`<div style="background:#3B82F6;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏍️</div>`, className:'', iconAnchor:[16,16] })
        }).addTo(mapObj.current).bindPopup(`<b>${r.profiles?.name}</b><br>${r.profiles?.phone || ''}`)
      }
    })
    // Vendor markers for active orders
    oList.forEach(o => {
      if (!o.vendors?.lat) return
      const key = `v_${o.vendor_id}`
      if (!markersRef.current[key]) {
        markersRef.current[key] = L.marker([Number(o.vendors.lat), Number(o.vendors.lng)], {
          icon: L.divIcon({ html:`<div style="background:#00C566;color:#fff;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff">📦</div>`, className:'', iconAnchor:[14,14] })
        }).addTo(mapObj.current).bindPopup(o.vendors.name)
      }
    })
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="page-header" style={{ margin:0 }}>
          <h1 className="page-title">🗺️ Live Map</h1>
          <p className="page-subtitle">{riders.length} riders online · {orders.length} active orders</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>↺ Refresh</button>
      </div>

      <div ref={mapRef} style={{ width:'100%', height:'60vh', minHeight:400, borderRadius:16, overflow:'hidden', marginBottom:16 }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:10 }}>🏍️ Online riders ({riders.length})</div>
          {riders.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>No riders online</div>
          : riders.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span>{r.profiles?.name}</span>
              <span style={{ fontSize:11, color: r.current_lat?'var(--poa-green-dark)':'var(--text-muted)' }}>
                {r.current_lat ? '📍 Located' : 'No GPS'}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:10 }}>📦 Active orders ({orders.length})</div>
          {orders.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>No active orders</div>
          : orders.map(o => (
            <div key={o.id} style={{ padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <div style={{ fontWeight:600 }}>{o.order_number}</div>
              <div style={{ color:'var(--text-muted)', fontSize:11 }}>{o.vendors?.name} · {o.status?.replace(/_/g,' ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
