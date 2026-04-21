import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'

export default function AdminPromos() {
  const [promos, setPromos]   = useState([])
  const [disputes, setDisputes] = useState([])
  const [payouts, setPayouts]  = useState([])
  const [tab, setTab]          = useState('promos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]        = useState({ code:'', description:'', discount_type:'percent', discount_value:'', min_order:'', max_uses:'', valid_until:'' })
  const [saving, setSaving]    = useState(false)

  useEffect(() => { load() }, [tab])

  const load = async () => {
    if (tab === 'promos') {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending:false })
      setPromos(data || [])
    } else if (tab === 'disputes') {
      const { data } = await supabase.from('disputes').select('*, profiles!disputes_customer_id_fkey(name,email), orders(order_number)').order('created_at', { ascending:false })
      setDisputes(data || [])
    } else {
      const { data } = await supabase.from('payout_requests').select('*, profiles!payout_requests_rider_id_fkey(name)').order('created_at', { ascending:false })
      setPayouts(data || [])
    }
  }

  const savePromo = async () => {
    if (!form.code || !form.discount_value) { toast.error('Code and value required'); return }
    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order: Number(form.min_order) || 0,
      max_uses: Number(form.max_uses) || null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: true,
    })
    if (error) toast.error(error.message)
    else { toast.success('Promo created!'); setShowForm(false); load() }
    setSaving(false)
  }

  const togglePromo = async (p) => {
    await supabase.from('promo_codes').update({ is_active: !p.is_active }).eq('id', p.id)
    load()
  }

  const resolveDispute = async (d, resolution) => {
    await supabase.from('disputes').update({ status:'resolved', resolution, resolved_at: new Date().toISOString() }).eq('id', d.id)
    toast.success('Dispute resolved')
    load()
  }

  const processPayout = async (p, status) => {
    await supabase.from('payout_requests').update({ status, processed_at: new Date().toISOString() }).eq('id', p.id)
    toast.success(`Payout ${status}`)
    load()
  }

  const TABS = [['promos','🏷️ Promo Codes'], ['disputes','🚨 Disputes'], ['payouts','💰 Payouts']]

  return (
    <div className="page">
      <div style={{ display:'flex', gap:8, marginBottom:20, borderBottom:'2px solid var(--border)', paddingBottom:12 }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background: tab===k?'var(--poa-green)':'transparent', color: tab===k?'#fff':'var(--text-muted)' }}>{l}</button>
        ))}
      </div>

      {/* Promo codes */}
      {tab === 'promos' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(p=>!p)}><Plus size={14}/> New promo</button>
          </div>
          {showForm && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['code','Code (e.g. SAVE20)','text'],['description','Description','text'],['discount_value','Value','number'],['min_order','Min order (KES)','number'],['max_uses','Max uses','number']].map(([k,p,t]) => (
                  <div key={k}>
                    <label className="form-label" style={{ fontSize:12 }}>{p}</label>
                    <input className="form-input" type={t} placeholder={p} value={form[k]} onChange={e => setForm(prev=>({...prev,[k]:e.target.value}))} style={{ padding:'8px 12px' }} />
                  </div>
                ))}
                <div>
                  <label className="form-label" style={{ fontSize:12 }}>Type</label>
                  <select className="form-select" value={form.discount_type} onChange={e => setForm(p=>({...p,discount_type:e.target.value}))} style={{ padding:'8px 12px' }}>
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize:12 }}>Valid until</label>
                  <input className="form-input" type="date" value={form.valid_until} onChange={e => setForm(p=>({...p,valid_until:e.target.value}))} style={{ padding:'8px 12px' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:2 }} onClick={savePromo} disabled={saving}>Create promo</button>
              </div>
            </div>
          )}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Expires</th><th>Status</th></tr></thead>
                <tbody>
                  {promos.map(p => (
                    <tr key={p.id}>
                      <td><div style={{ fontWeight:700, fontFamily:'monospace' }}>{p.code}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.description}</div></td>
                      <td style={{ fontSize:13, textTransform:'capitalize' }}>{p.discount_type}</td>
                      <td style={{ fontWeight:700 }}>{p.discount_type==='percent'?`${p.discount_value}%`:`KES ${p.discount_value}`}</td>
                      <td style={{ fontSize:13 }}>{p.uses}/{p.max_uses||'∞'}</td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>{p.valid_until?formatDateTime(p.valid_until):'Never'}</td>
                      <td>
                        <button onClick={() => togglePromo(p)} style={{ padding:'4px 10px', borderRadius:99, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background: p.is_active?'var(--poa-green-light)':'var(--bg-elevated)', color: p.is_active?'var(--poa-green-dark)':'var(--text-muted)' }}>
                          {p.is_active?'Active':'Off'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Disputes */}
      {tab === 'disputes' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {disputes.length === 0 ? <div className="empty-state"><p>No disputes</p></div>
          : disputes.map(d => (
            <div key={d.id} className="card" style={{ borderLeft:`4px solid ${d.status==='open'?'var(--poa-orange)':d.status==='resolved'?'var(--poa-green)':'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700 }}>{d.orders?.order_number}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{d.profiles?.name} · {formatDateTime(d.created_at)}</div>
                </div>
                <span className={`badge ${d.status==='open'?'badge-yellow':d.status==='resolved'?'badge-green':'badge-gray'}`}>{d.status}</span>
              </div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{d.reason}</div>
              {d.description && <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:10 }}>{d.description}</div>}
              {d.status === 'open' && (
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { const r = prompt('Resolution note:'); if(r) resolveDispute(d, r) }}>Resolve</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resolveDispute(d, 'Closed without action')}>Close</button>
                </div>
              )}
              {d.resolution && <div style={{ fontSize:12, color:'var(--poa-green-dark)', marginTop:8 }}>✅ {d.resolution}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Payouts */}
      {tab === 'payouts' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rider</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:600 }}>{p.profiles?.name}</td>
                    <td style={{ fontWeight:700 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ textTransform:'capitalize', fontSize:13 }}>{p.method}</td>
                    <td style={{ fontSize:11, color:'var(--text-muted)' }}>{formatDateTime(p.created_at)}</td>
                    <td><span className={`badge ${p.status==='pending'?'badge-yellow':p.status==='paid'?'badge-green':p.status==='approved'?'badge-blue':'badge-red'}`}>{p.status}</span></td>
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => processPayout(p,'approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => processPayout(p,'rejected')}>Reject</button>
                        </div>
                      )}
                      {p.status === 'approved' && (
                        <button className="btn btn-primary btn-sm" onClick={() => processPayout(p,'paid')}>Mark paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
