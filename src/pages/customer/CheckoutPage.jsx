import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, getRoadDistance } from '../../utils'
import { ArrowLeft, Zap, MapPin } from 'lucide-react'
import DeliveryPointPicker from '../../components/customer/DeliveryPointPicker'
import toast from 'react-hot-toast'

const DEFAULT_LAT = -1.2921
const DEFAULT_LNG = 36.8219

export default function CheckoutPage() {
  const navigate            = useNavigate()
  const { profile }         = useAuth()
  const [cart, setCart]     = useState(null)
  const [address, setAddress]     = useState('')
  const [lat, setLat]             = useState(DEFAULT_LAT)
  const [lng, setLng]             = useState(DEFAULT_LNG)
  const [deliveryPoint, setDeliveryPoint] = useState(null)
  const [quote, setQuote]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [gettingQuote, setGettingQuote] = useState(false)
  const [payMethod, setPayMethod] = useState('mpesa')
  const [notes, setNotes]         = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [usePoints, setUsePoints] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const loyaltyBalance = profile?.loyalty_points_balance || 0
  const loyaltyDiscount = usePoints ? Math.min(Math.floor(loyaltyBalance / 10), subtotal * 0.2) : 0

  useEffect(() => {
    const stored = localStorage.getItem('poa_cart')
    if (stored) setCart(JSON.parse(stored))
    else navigate('/customer')
  }, [])

  // Recalculate price when coordinates change
  useEffect(() => {
    if (!lat || !cart?.vendor) return
    setGettingQuote(true)
    const vLat = cart.vendor.lat || -1.292
    const vLng = cart.vendor.lng || 36.817
    getRoadDistance({ lat: vLat, lng: vLng }, { lat, lng })
      .then(road => supabase.rpc('calculate_delivery_price', {
        p_pickup_lat: vLat, p_pickup_lng: vLng,
        p_dropoff_lat: lat, p_dropoff_lng: lng,
        p_road_km: road.distance_km,
      }))
      .then(({ data }) => { if (data) setQuote(data); setGettingQuote(false) })
  }, [lat, lng, cart])

  const handleSelectPoint = (point) => {
    setDeliveryPoint(point)
    if (point) {
      setLat(Number(point.lat)); setLng(Number(point.lng))
      setAddress(`${point.name}${point.landmark ? ` — ${point.landmark}` : ''}`)
    } else {
      setLat(DEFAULT_LAT); setLng(DEFAULT_LNG); setAddress('')
    }
  }

  const handleMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setDeliveryPoint(null)
        setLat(pos.coords.latitude); setLng(pos.coords.longitude)
        setAddress(`My GPS location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`)
        toast.success('Location detected!')
      },
      () => toast.error('Could not get your location')
    )
  }

  const subtotal = cart?.items?.reduce((t, i) => t + i.price * i.quantity, 0) || 0
  const deliveryFee = quote?.total_fare || 80
  const promoDiscount = promoData ? (promoData.discount_type === 'percent' ? Math.round(subtotal * promoData.discount_value / 100) : promoData.discount_value) : 0
  const total = Math.max(0, subtotal + deliveryFee - promoDiscount - loyaltyDiscount)

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    const { data, error } = await supabase.from('promo_codes').select('*')
      .eq('code', promoCode.trim().toUpperCase()).eq('is_active', true).maybeSingle()
    setPromoLoading(false)
    if (!data) { toast.error('Invalid or expired promo code'); setPromoData(null); return }
    if (data.valid_until && new Date(data.valid_until) < new Date()) { toast.error('Promo code expired'); return }
    if (data.min_order && subtotal < data.min_order) { toast.error(`Minimum order KES ${data.min_order} required`); return }
    setPromoData(data)
    toast.success(`Promo applied! ${data.discount_type === 'percent' ? data.discount_value + '%' : 'KES ' + data.discount_value} off`)
  }

  const placeOrder = async () => {
    if (!address.trim()) { toast.error('Please enter or select a delivery address'); return }
    setLoading(true)
    try {
      const orderNum = 'POA-' + Date.now().toString().slice(-6)
      const { data: order, error } = await supabase.from('orders').insert({
        order_number: orderNum,
        customer_id:  profile.id,
        vendor_id:    cart.vendor.id,
        status:       'pending',
        pickup_address:  cart.vendor.address || cart.vendor.name,
        pickup_lat:      cart.vendor.lat,
        pickup_lng:      cart.vendor.lng,
        dropoff_address: address,
        dropoff_lat:     lat,
        dropoff_lng:     lng,
        delivery_notes:  notes,
        subtotal, delivery_fee: deliveryFee,
        service_fee:     quote?.service_fee || 20,
        surge_multiplier: quote?.surge_multiplier || 1,
        total_amount:    total,
        distance_km:     quote?.distance_km || 0,
        is_surge:        quote?.is_surge || false,
        payment_method:  payMethod,
        payment_status:  'pending',
      }).select('id').single()

      if (error) throw error

      await supabase.from('order_items').insert(
        cart.items.map(i => ({
          order_id: order.id, menu_item_id: i.id,
          name: i.name, price: i.price, quantity: i.quantity,
          subtotal: i.price * i.quantity,
        }))
      )

      localStorage.removeItem('poa_cart')
      toast.success(`Order ${orderNum} placed! 🎉`)
      navigate(`/customer/track/${order.id}`)
    } catch (err) {
      toast.error('Order failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!cart) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Checkout</h1>

      {/* Order summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📦 {cart.vendor.name}</h3>
        {cart.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.name}</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 10 }}>
          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
        </div>
      </div>

      {/* Delivery address */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 4 }}>📍 Delivery address</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Choose a pickup point near you, or use your GPS location
        </p>

        <DeliveryPointPicker
          selected={deliveryPoint}
          onSelect={handleSelectPoint}
          onUseMyLocation={handleMyLocation}
        />

        {/* Manual address override */}
        {address && (
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Delivery address</label>
            <input className="form-input" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Confirm or edit address" />
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label className="form-label">Delivery notes (optional)</label>
          <input className="form-input" placeholder="e.g. Gate 3, call on arrival"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Delivery fee */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🚴 Delivery fee</h3>
        {!address ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Select a delivery point above to see the fee</p>
        ) : gettingQuote ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Calculating...</span>
          </div>
        ) : quote ? (
          <>
            {quote.is_surge && (
              <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} /> Surge pricing ({quote.surge_multiplier}×)
              </div>
            )}
            {[['Distance', `${Number(quote.distance_km).toFixed(1)} km`], ['Base fare', formatCurrency(quote.base_fare)], ['Distance fare', formatCurrency(quote.distance_fare)], ['Service fee', formatCurrency(quote.service_fee)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--text-muted)' }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Delivery fee</span>
              <span style={{ color: 'var(--poa-green-dark)' }}>{formatCurrency(quote.total_fare)}</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Default fee: {formatCurrency(80)}</p>
        )}
      </div>

      {/* Promo code */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight:700, marginBottom:12 }}>🏷️ Promo code</h3>
        <div style={{ display:'flex', gap:8 }}>
          <input className="form-input" placeholder="Enter promo code" value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoData(null) }}
            style={{ flex:1, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.1em' }} />
          <button className="btn btn-secondary" onClick={applyPromo} disabled={promoLoading}>
            {promoLoading ? '...' : 'Apply'}
          </button>
        </div>
        {promoData && <div style={{ marginTop:8, color:'var(--poa-green-dark)', fontSize:13, fontWeight:600 }}>
          ✅ {promoData.description} — saving {promoData.discount_type==='percent' ? promoData.discount_value+'%' : formatCurrency(promoData.discount_value)}
        </div>}
      </div>

      {/* Loyalty points */}
      {loyaltyBalance > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>🏆 Use loyalty points</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{loyaltyBalance} points = KES {Math.floor(loyaltyBalance/10)} discount</div>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} />
              <span style={{ fontSize:13, fontWeight:600 }}>Use {Math.floor(loyaltyBalance/10)*10} points</span>
            </label>
          </div>
          {usePoints && <div style={{ marginTop:8, color:'var(--poa-green-dark)', fontSize:13, fontWeight:600 }}>
            ✅ Saving {formatCurrency(loyaltyDiscount)} with loyalty points
          </div>}
        </div>
      )}

      {/* Scheduled order */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ fontWeight:700, marginBottom:12 }}>⏰ Schedule order (optional)</h3>
        <input type="datetime-local" className="form-input" value={scheduledFor}
          onChange={e => setScheduledFor(e.target.value)}
          min={new Date(Date.now() + 30*60000).toISOString().slice(0,16)} />
        {scheduledFor && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>Order will be placed for {new Date(scheduledFor).toLocaleString()}</div>}
      </div>

      {/* Payment */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>💳 Payment</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['mpesa','📱 M-Pesa'], ['cash','💵 Cash'], ['card','💳 Card']].map(([val, label]) => (
            <button key={val} onClick={() => setPayMethod(val)} style={{ padding: '10px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', border: `2px solid ${payMethod === val ? 'var(--poa-green)' : 'var(--border)'}`, background: payMethod === val ? 'var(--poa-green-light)' : '#fff', color: payMethod === val ? 'var(--poa-green-dark)' : 'var(--text-secondary)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Total to pay</span>
<div>
            {promoDiscount > 0 && <div style={{ fontSize:12, color:'var(--text-muted)', textDecoration:'line-through' }}>{formatCurrency(subtotal + deliveryFee)}</div>}
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--poa-green-dark)' }}>{formatCurrency(total)}</span>
            {(promoDiscount > 0 || loyaltyDiscount > 0) && <div style={{ fontSize:11, color:'var(--poa-green-dark)', fontWeight:600 }}>You saved {formatCurrency(promoDiscount + loyaltyDiscount)} 🎉</div>}
          </div>
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={placeOrder} disabled={loading || !address.trim()}>
          {loading ? 'Placing order...' : `Confirm order — ${formatCurrency(total)}`}
        </button>
        {!address && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>Select a delivery point or use your location to continue</p>}
      </div>
    </div>
  )
}
