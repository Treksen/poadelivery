import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

function StarPicker({ value, onChange, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{ fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s', transform: n <= value ? 'scale(1.15)' : 'scale(1)', filter: n <= value ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { id } = useParams()  // order id
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [foodRating, setFood]     = useState(0)
  const [riderRating, setRider]   = useState(0)
  const [overallRating, setOverall] = useState(0)
  const [comment, setComment]     = useState('')
  const [saving, setSaving]       = useState(false)

  const submit = async () => {
    if (!overallRating) { toast.error('Please give an overall rating'); return }
    setSaving(true)
    const { data: order } = await supabase.from('orders').select('vendor_id, rider_id').eq('id', id).single()
    const { error } = await supabase.from('reviews').insert({
      order_id: id, customer_id: profile.id,
      vendor_id: order.vendor_id, rider_id: order.rider_id,
      food_rating: foodRating || null, rider_rating: riderRating || null,
      overall_rating: overallRating, comment: comment.trim() || null,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    await supabase.from('orders').update({ customer_rating: overallRating }).eq('id', id)
    // Award loyalty points
    const { data: ord } = await supabase.from('orders').select('total_amount').eq('id', id).single()
    if (ord) await supabase.rpc('award_loyalty_points', { p_user_id: profile.id, p_order_id: id, p_amount: ord.total_amount })
    toast.success('Review submitted! Points awarded 🎉')
    navigate('/customer/orders')
  }

  return (
    <div className="page" style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">Rate your order</h1></div>
      <div className="card">
        <StarPicker value={overallRating} onChange={setOverall} label="⭐ Overall experience *" />
        <StarPicker value={foodRating}    onChange={setFood}    label="🍽️ Food quality" />
        <StarPicker value={riderRating}   onChange={setRider}   label="🏍️ Rider service" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>💬 Written review (optional)</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder="Tell us about your experience..."
            className="form-input" style={{ resize: 'vertical', minHeight: 80 }} />
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={saving || !overallRating}>
          {saving ? 'Submitting...' : 'Submit review →'}
        </button>
      </div>
    </div>
  )
}
