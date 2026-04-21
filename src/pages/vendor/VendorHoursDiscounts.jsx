import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export function VendorHours() {
  const { profile } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [hours, setHours]   = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('vendors').select('id').eq('owner_id', profile.id).maybeSingle().then(({ data }) => {
      if (!data) return
      setVendor(data)
      supabase.from('vendor_hours').select('*').eq('vendor_id', data.id).then(({ data: h }) => {
        const existing = h || []
        const full = DAYS.map((_, i) => existing.find(e => e.day_of_week === i) || { day_of_week: i, open_time: '08:00', close_time: '22:00', is_closed: false })
        setHours(full)
      })
    })
  }, [profile?.id])

  const save = async () => {
    setSaving(true)
    await supabase.from('vendor_hours').upsert(hours.map(h => ({ ...h, vendor_id: vendor.id })), { onConflict: 'vendor_id,day_of_week' })
    toast.success('Hours saved')
    setSaving(false)
  }

  const update = (i, key, val) => setHours(p => p.map((h, idx) => idx === i ? { ...h, [key]: val } : h))

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header"><h1 className="page-title">⏰ Operating Hours</h1></div>
      <div className="card">
        {hours.map((h, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
            <div style={{ width:90, fontWeight:600, fontSize:14 }}>{DAYS[i]}</div>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13 }}>
              <input type="checkbox" checked={h.is_closed} onChange={e => update(i,'is_closed',e.target.checked)} style={{ accentColor:'var(--poa-orange)' }} />
              Closed
            </label>
            {!h.is_closed && (
              <>
                <input type="time" value={h.open_time} onChange={e => update(i,'open_time',e.target.value)} className="form-input" style={{ width:130, padding:'8px 10px' }} />
                <span style={{ color:'var(--text-muted)' }}>–</span>
                <input type="time" value={h.close_time} onChange={e => update(i,'close_time',e.target.value)} className="form-input" style={{ width:130, padding:'8px 10px' }} />
              </>
            )}
          </div>
        ))}
        <button className="btn btn-primary btn-full" style={{ marginTop:16 }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save hours'}
        </button>
      </div>
    </div>
  )
}

export function VendorDiscounts() {
  const { profile } = useAuth()
  const [vendor, setVendor]       = useState(null)
  const [discounts, setDiscounts] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ name:'', discount_type:'percent', discount_value:'', applies_to:'all', is_active:true })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('vendors').select('id').eq('owner_id', profile.id).maybeSingle().then(({ data }) => {
      if (!data) return
      setVendor(data)
      loadDiscounts(data.id)
    })
  }, [profile?.id])

  const loadDiscounts = (vid) => {
    supabase.from('vendor_discounts').select('*').eq('vendor_id', vid).order('created_at', { ascending:false })
      .then(({ data }) => setDiscounts(data || []))
  }

  const saveDiscount = async () => {
    if (!form.name || !form.discount_value) { toast.error('Name and value required'); return }
    setSaving(true)
    await supabase.from('vendor_discounts').insert({ ...form, vendor_id: vendor.id, discount_value: Number(form.discount_value) })
    toast.success('Discount added')
    setShowForm(false); setForm({ name:'', discount_type:'percent', discount_value:'', applies_to:'all', is_active:true })
    loadDiscounts(vendor.id)
    setSaving(false)
  }

  const toggle = async (d) => {
    await supabase.from('vendor_discounts').update({ is_active: !d.is_active }).eq('id', d.id)
    loadDiscounts(vendor.id)
  }

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 className="page-title">🏷️ Discounts</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(p=>!p)}>+ Add discount</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:16 }}>
          {[['name','Discount name','text','e.g. Happy Hour 20% off'],['discount_value','Value','number','e.g. 20']].map(([k,l,t,p]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{l}</label>
              <input className="form-input" type={t} placeholder={p} value={form[k]} onChange={e => setForm(prev => ({...prev,[k]:e.target.value}))} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.discount_type} onChange={e => setForm(p=>({...p,discount_type:e.target.value}))}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (KES)</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveDiscount} disabled={saving}>Add discount</button>
          </div>
        </div>
      )}

      {discounts.length === 0 ? (
        <div className="empty-state"><p>No discounts yet</p></div>
      ) : discounts.map(d => (
        <div key={d.id} className="card" style={{ marginBottom:10, opacity: d.is_active ? 1 : 0.6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700 }}>{d.name}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                {d.discount_type === 'percent' ? `${d.discount_value}% off` : `KES ${d.discount_value} off`} · {d.applies_to}
              </div>
            </div>
            <button onClick={() => toggle(d)} style={{ padding:'5px 12px', borderRadius:99, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: d.is_active?'var(--poa-green-light)':'var(--bg-elevated)', color: d.is_active?'var(--poa-green-dark)':'var(--text-muted)' }}>
              {d.is_active ? 'Active' : 'Off'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
