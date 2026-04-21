import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { MapPin, Search, X, Navigation } from 'lucide-react'

const ZONE_LABELS = {
  thika_road: '🛣️ Thika Superhighway',
  westlands:  '🏙️ Westlands / Ngong Rd',
  eastlands:  '🏘️ Eastlands',
  south:      '🌿 South Nairobi',
  cbd:        '🏢 CBD',
  satellite:  '🌍 Satellite Towns',
}

export default function DeliveryPointPicker({ onSelect, onUseMyLocation, selected }) {
  const [points, setPoints]   = useState([])
  const [search, setSearch]   = useState('')
  const [zone, setZone]       = useState('all')
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const mapRef                = useRef(null)
  const mapObj                = useRef(null)

  useEffect(() => {
    supabase.from('delivery_points').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { setPoints(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!open || !mapRef.current || mapObj.current || !window.L) return
    const L = window.L
    const map = L.map(mapRef.current).setView([-1.286, 36.817], 10)
    mapObj.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map)
    points.forEach(p => {
      L.circleMarker([p.lat, p.lng], { radius: 6, fillColor: '#00C566', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9 })
        .addTo(map).bindTooltip(p.name, { direction: 'top' })
        .on('click', () => { onSelect(p); setOpen(false) })
    })
  }, [open, points])

  useEffect(() => {
    if (selected && mapObj.current) mapObj.current.setView([selected.lat, selected.lng], 14)
  }, [selected])

  const filtered = points.filter(p =>
    (zone === 'all' || p.zone === zone) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.landmark?.toLowerCase().includes(search.toLowerCase()))
  )
  const zones = [...new Set(points.map(p => p.zone))]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setOpen(true)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `2px solid ${selected ? 'var(--poa-green)' : 'var(--border-strong)'}`, background: selected ? 'var(--poa-green-light)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} style={{ color: selected ? 'var(--poa-green)' : 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--poa-green-dark)' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.landmark}</div>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose a pickup point (optional)...</span>
            )}
          </div>
          {selected && <X size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} onClick={e => { e.stopPropagation(); onSelect(null) }} />}
        </button>
        <button onClick={onUseMyLocation} className="btn btn-secondary" style={{ flexShrink: 0 }}>
          <Navigation size={14} /> My location
        </button>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', flexDirection: 'column' }} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px 16px 0 0', marginTop: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Choose delivery point</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{points.length} points within 40km of Nairobi</div>
              </div>
              <button className="btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <div ref={mapRef} style={{ height: 180 }} />

            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="Search by name or landmark..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10, paddingBottom: 4 }}>
                {[['all', `All (${points.length})`], ...zones.map(z => [z, `${ZONE_LABELS[z]?.split(' ')[0] || ''} ${z.replace('_',' ')} (${points.filter(p=>p.zone===z).length})`])].map(([val, label]) => (
                  <button key={val} onClick={() => setZone(val)} style={{ padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', background: zone === val ? 'var(--poa-green)' : 'var(--bg-elevated)', color: zone === val ? '#fff' : 'var(--text-secondary)' }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" /></div>
              : filtered.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No points found</div>
              : filtered.map(p => (
                <div key={p.id} onClick={() => { onSelect(p); setOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected?.id === p.id ? 'var(--poa-green-light)' : 'transparent' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: selected?.id === p.id ? 'var(--poa-green)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={15} style={{ color: selected?.id === p.id ? '#fff' : 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.landmark} · {ZONE_LABELS[p.zone] || p.zone}</div>
                  </div>
                  {selected?.id === p.id && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--poa-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>✓</span></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
