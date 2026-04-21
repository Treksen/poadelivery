import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, MapPin } from 'lucide-react'

const ROLES = [
  { id: 'customer', icon: '🛒', label: 'Customer',   desc: 'Order food' },
  { id: 'rider',    icon: '🏍️', label: 'Rider',      desc: 'Earn money' },
  { id: 'vendor',   icon: '🍽️', label: 'Restaurant', desc: 'List & sell' },
]

const inputStyle = {
  width: '100%', padding: '13px 14px', border: '1px solid #D1D5DB',
  borderRadius: 8, fontSize: 16, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }

export default function SignupPage() {
  const [params]           = useSearchParams()
  const [role, setRole]    = useState(params.get('role') || 'customer')
  const [step, setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const navigate           = useNavigate()
  const { signUp }         = useAuth()

  const [name, setName]    = useState('')
  const [email, setEmail]  = useState('')
  const [password, setPass] = useState('')
  const [phone, setPhone]  = useState('')

  const [bizName, setBizName]  = useState('')
  const [bizDesc, setBizDesc]  = useState('')
  const [bizCat, setBizCat]    = useState('restaurant')
  const [address, setAddress]  = useState('')
  const [lat, setLat]          = useState(null)
  const [lng, setLng]          = useState(null)

  const [vehicle, setVehicle]  = useState('motorcycle')
  const [plate, setPlate]      = useState('')

  const mapRef    = useRef(null)
  const mapObj    = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (role !== 'vendor' || step !== 2 || !mapRef.current || mapObj.current || !window.L) return
    setTimeout(() => {
      const L = window.L
      const map = L.map(mapRef.current).setView([-1.2921, 36.8219], 12)
      mapObj.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map)
      const icon = L.divIcon({ html: '<div style="background:#F59E0B;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>', className: '', iconAnchor: [11, 11] })
      map.on('click', e => {
        setLat(e.latlng.lat); setLng(e.latlng.lng)
        if (markerRef.current) markerRef.current.setLatLng(e.latlng)
        else markerRef.current = L.marker(e.latlng, { icon }).addTo(map).bindPopup('Your restaurant').openPopup()
      })
    }, 100)
  }, [role, step])

  const getMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const lt = pos.coords.latitude, ln = pos.coords.longitude
      setLat(lt); setLng(ln)
      if (mapObj.current) {
        mapObj.current.setView([lt, ln], 15)
        mapObj.current.fire('click', { latlng: { lat: lt, lng: ln } })
      }
      toast.success('Location pinned!')
    }, () => toast.error('Could not get location'))
  }

  const submit = async () => {
    if (!name.trim())  { toast.error('Name is required'); return }
    if (!email.trim()) { toast.error('Email is required'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (role === 'vendor' && (!lat || !lng)) { toast.error('Please pin your restaurant on the map'); return }

    setLoading(true)
    try {
      const meta = { name: name.trim(), role, phone: phone.trim() }
      if (role === 'vendor') Object.assign(meta, { business_name: bizName.trim() || name.trim(), description: bizDesc.trim(), category: bizCat, address: address.trim(), lat, lng })
      if (role === 'rider')  Object.assign(meta, { vehicle_type: vehicle, vehicle_plate: plate.trim() })

      const { data, error } = await signUp(email.trim(), password, meta)
      if (error) {
        const msg = error.message || ''
        if (msg.includes('rate limit'))  toast.error('Too many attempts. Wait a few minutes.', { duration: 6000 })
        else if (msg.includes('already registered')) { toast.error('Email already registered.'); navigate('/login') }
        else if (msg.includes('Database error')) toast.error('Server error — run migration 006 in Supabase SQL Editor.', { duration: 8000 })
        else toast.error(msg || 'Signup failed')
        setLoading(false); return
      }

      if (role === 'vendor' && data?.user) {
        const { data: ex } = await supabase.from('vendors').select('id').eq('owner_id', data.user.id).maybeSingle()
        if (!ex) await supabase.from('vendors').insert({ owner_id: data.user.id, name: bizName.trim() || name.trim(), description: bizDesc.trim(), category: bizCat, address: address.trim() || 'Nairobi, Kenya', lat, lng, phone: phone.trim(), email: email.trim(), is_active: false, is_open: false, delivery_time: 30, min_order: 200 })
      }

      toast.success(role === 'vendor' ? 'Restaurant registered! You can now log in.' : 'Account created! You can now log in.', { duration: 5000 })
      navigate('/login')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const canContinue = name.trim() && email.trim() && password.length >= 6

  return (
    <div style={{ minHeight: 'calc(100vh)', background: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => step > 1 ? setStep(1) : navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, padding: 0 }}>
          <ArrowLeft size={16} /> {step > 1 ? 'Back' : 'Home'}
        </button>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#00C566' }}>Poa</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>Step {step}/{role === 'customer' ? 1 : 2}</div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 40px' }}>

        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 4 }}>Create account</h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Join Poa Delivery today</p>

        {/* Step 1 — always shown */}
        {step === 1 && (
          <>
            {/* Role picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>I want to</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setRole(r.id)} style={{
                    padding: '12px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    border: `2px solid ${role === r.id ? '#00C566' : '#E5E7EB'}`,
                    background: role === r.id ? '#E6FFF3' : '#fff',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: role === r.id ? '#065F46' : '#374151' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            {[['Full name', 'text', name, setName, 'John Kamau', 'name'],
              ['Email address', 'email', email, setEmail, 'you@example.com', 'email'],
              ['Phone (optional)', 'tel', phone, setPhone, '+254 7XX XXX XXX', 'tel']
            ].map(([lbl, type, val, set, ph, ac]) => (
              <div key={lbl} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{lbl}</label>
                <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} autoComplete={ac} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {role === 'customer' ? (
              <button onClick={submit} disabled={loading || !canContinue}
                style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: canContinue ? '#00C566' : '#E5E7EB', color: canContinue ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 16, cursor: canContinue ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {loading ? 'Creating account...' : 'Create account →'}
              </button>
            ) : (
              <button onClick={() => setStep(2)} disabled={!canContinue}
                style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: canContinue ? '#111827' : '#E5E7EB', color: canContinue ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 16, cursor: canContinue ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Continue →
              </button>
            )}
          </>
        )}

        {/* Step 2 — Rider */}
        {step === 2 && role === 'rider' && (
          <>
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#1E40AF', display: 'flex', gap: 8 }}>
              🏍️ You'll be automatically set online when you log in.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Vehicle type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[['motorcycle','🏍️ Motorcycle'],['bicycle','🚲 Bicycle'],['car','🚗 Car'],['walking','🚶 Walking']].map(([v, l]) => (
                  <button key={v} onClick={() => setVehicle(v)} style={{ padding: '12px', borderRadius: 8, border: `2px solid ${vehicle === v ? '#111827' : '#E5E7EB'}`, background: vehicle === v ? '#111827' : '#fff', color: vehicle === v ? '#fff' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Plate number (optional)</label>
              <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="e.g. KBZ 123A" style={inputStyle} />
            </div>
            <button onClick={submit} disabled={loading}
              style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : 'Create rider account →'}
            </button>
          </>
        )}

        {/* Step 2 — Vendor */}
        {step === 2 && role === 'vendor' && (
          <>
            {[['Restaurant name', bizName, setBizName, "e.g. Mama's Kitchen"],
              ['Address / Area', address, setAddress, 'e.g. Westlands, Nairobi']
            ].map(([lbl, val, set, ph]) => (
              <div key={lbl} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{lbl}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Category</label>
              <select value={bizCat} onChange={e => setBizCat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['restaurant','cafe','bakery','grocery','pharmacy','other'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={bizDesc} onChange={e => setBizDesc(e.target.value)} rows={2} placeholder="What makes your restaurant special?"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>📍 Pin your location</label>
                <button onClick={getMyLocation} style={{ fontSize: 12, color: '#00C566', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Use my location
                </button>
              </div>
              <div ref={mapRef} style={{ height: 220, borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }} />
              {lat
                ? <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>✅ Pinned at {lat.toFixed(4)}, {lng.toFixed(4)}</div>
                : <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Tap the map to pin your restaurant location</div>
              }
            </div>

            <button onClick={submit} disabled={loading || !lat}
              style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: (lat && !loading) ? '#F59E0B' : '#E5E7EB', color: (lat && !loading) ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 16, cursor: lat ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {loading ? 'Registering...' : 'Register restaurant →'}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6B7280' }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} style={{ color: '#00C566', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Log in</button>
        </p>
      </div>
    </div>
  )
}
