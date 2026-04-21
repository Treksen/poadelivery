import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const REASONS = ['Wrong items delivered','Items missing','Food was cold or stale','Rider was rude','Long wait time','Overcharged','Other']

export default function DisputePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!reason) { toast.error('Please select a reason'); return }
    setSaving(true)
    const { error } = await supabase.from('disputes').insert({
      order_id: id, customer_id: profile.id,
      reason, description: description.trim() || null,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Dispute submitted. We\'ll review within 24 hours.')
    navigate('/customer/orders')
  }

  return (
    <div className="page" style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">🚨 Raise a Dispute</h1><p className="page-subtitle">We'll review and respond within 24 hours</p></div>
      <div className="card">
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {REASONS.map(r => (
              <label key={r} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:`1.5px solid ${reason===r?'var(--poa-green)':'var(--border)'}`, cursor:'pointer', background: reason===r?'var(--poa-green-light)':'transparent' }}>
                <input type="radio" name="reason" value={r} checked={reason===r} onChange={() => setReason(r)} style={{ accentColor:'var(--poa-green)' }} />
                <span style={{ fontSize:14, fontWeight: reason===r?600:400 }}>{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Details (optional)</label>
          <textarea className="form-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue in more detail..." style={{ resize:'vertical' }} />
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={saving || !reason}>
          {saving ? 'Submitting...' : 'Submit dispute'}
        </button>
      </div>
    </div>
  )
}
