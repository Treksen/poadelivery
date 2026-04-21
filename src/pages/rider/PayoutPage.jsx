import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDateTime } from '../../utils'
import toast from 'react-hot-toast'

export default function PayoutPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [riderData, setRiderData] = useState(null)
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState('mpesa')
  const [account, setAccount] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rider_profiles').select('*').eq('id', profile.id).single()
      .then(({ data }) => setRiderData(data))
    supabase.from('payout_requests').select('*').eq('rider_id', profile.id)
      .order('created_at', { ascending:false }).then(({ data }) => setRequests(data || []))
  }, [profile?.id])

  const request = async () => {
    if (!amount || Number(amount) < 100) { toast.error('Minimum payout is KES 100'); return }
    if (Number(amount) > (riderData?.total_earned || 0)) { toast.error('Amount exceeds your earnings'); return }
    setSaving(true)
    const { error } = await supabase.from('payout_requests').insert({
      rider_id: profile.id, amount: Number(amount), method, account_no: account || null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Payout request submitted!'); setAmount(''); setAccount('') }
    supabase.from('payout_requests').select('*').eq('rider_id', profile.id)
      .order('created_at', { ascending:false }).then(({ data }) => setRequests(data || []))
    setSaving(false)
  }

  const STATUS_COLOR = { pending:'badge-yellow', approved:'badge-blue', paid:'badge-green', rejected:'badge-red' }

  return (
    <div className="page" style={{ maxWidth:500 }}>
      <div className="page-header"><h1 className="page-title">💰 Request Payout</h1></div>

      <div className="card" style={{ marginBottom:16, background:'linear-gradient(135deg,#0D1117,#1a2744)', border:'none' }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Available earnings</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color:'#00C566' }}>
          {formatCurrency(riderData?.total_earned || 0)}
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:4 }}>{riderData?.total_deliveries || 0} total deliveries</div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div className="form-group">
          <label className="form-label">Amount (KES)</label>
          <input className="form-input" type="number" placeholder="Min KES 100" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Payout method</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[['mpesa','📱 M-Pesa'],['bank','🏦 Bank'],['cash','💵 Cash']].map(([v,l]) => (
              <button key={v} onClick={() => setMethod(v)} style={{ padding:'10px 4px', borderRadius:8, border:`2px solid ${method===v?'var(--poa-green)':'var(--border)'}`, background: method===v?'var(--poa-green-light)':'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>{l}</button>
            ))}
          </div>
        </div>
        {method !== 'cash' && (
          <div className="form-group">
            <label className="form-label">{method === 'mpesa' ? 'M-Pesa number' : 'Account number'}</label>
            <input className="form-input" placeholder={method==='mpesa'?'+254 7XX XXX XXX':'Account number'} value={account} onChange={e => setAccount(e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary btn-full btn-lg" onClick={request} disabled={saving || !amount}>
          {saving ? 'Submitting...' : 'Request payout'}
        </button>
      </div>

      {requests.length > 0 && (
        <div className="card">
          <div style={{ fontWeight:700, marginBottom:12 }}>Request history</div>
          {requests.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight:600 }}>{formatCurrency(r.amount)}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{formatDateTime(r.created_at)} · {r.method}</div>
                {r.note && <div style={{ fontSize:11, color:'var(--poa-orange)' }}>{r.note}</div>}
              </div>
              <span className={`badge ${STATUS_COLOR[r.status]||'badge-gray'}`} style={{ textTransform:'capitalize', alignSelf:'center' }}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
