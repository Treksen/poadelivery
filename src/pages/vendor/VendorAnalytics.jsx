import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', boxShadow:'var(--shadow-md)', fontSize:13 }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color, fontWeight:600 }}>
          {p.name === 'revenue' ? formatCurrency(p.value) : p.value + ' orders'}
        </div>
      ))}
    </div>
  )
}

export default function VendorAnalytics() {
  const { profile }         = useAuth()
  const [vendor, setVendor] = useState(null)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange]   = useState('7')

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('vendors').select('id,name').eq('owner_id', profile.id).maybeSingle()
      .then(({ data: v }) => { if (v) { setVendor(v); loadAnalytics(v.id) } else setLoading(false) })
  }, [profile?.id])

  useEffect(() => { if (vendor?.id) loadAnalytics(vendor.id) }, [range])

  const loadAnalytics = async (vendorId) => {
    setLoading(true)
    const since = new Date(Date.now() - Number(range) * 86400000).toISOString()

    const { data: orders } = await supabase.from('orders')
      .select('id, total_amount, subtotal, delivery_fee, created_at, vendor_response_secs, order_items(name, quantity, price)')
      .eq('vendor_id', vendorId).eq('status', 'delivered')
      .gte('created_at', since).order('created_at', { ascending: true })

    const all = orders || []

    // Build daily data — fill every day in range
    const dailyMap = {}
    for (let d = Number(range) - 1; d >= 0; d--) {
      const day = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
      dailyMap[day] = { date: day, revenue: 0, orders: 0 }
    }
    all.forEach(o => {
      const day = o.created_at.slice(0, 10)
      if (dailyMap[day]) {
        dailyMap[day].revenue += Number(o.subtotal || o.total_amount || 0)
        dailyMap[day].orders  += 1
      }
    })
    const daily = Object.values(dailyMap).map(d => ({
      ...d,
      label: new Date(d.date + 'T12:00:00').toLocaleDateString('en-KE', { month:'short', day:'numeric' }),
    }))

    // Top items
    const itemMap = {}
    all.forEach(o => (o.order_items || []).forEach(i => {
      if (!itemMap[i.name]) itemMap[i.name] = { count: 0, revenue: 0 }
      itemMap[i.name].count   += Number(i.quantity || 1)
      itemMap[i.name].revenue += Number(i.price || 0) * Number(i.quantity || 1)
    }))
    const topItems = Object.entries(itemMap).sort((a,b) => b[1].count - a[1].count).slice(0, 8)
    const topItemsChart = topItems.map(([name, d]) => ({
      name:    name.length > 20 ? name.slice(0,18)+'…' : name,
      sold:    d.count,
      revenue: d.revenue,
    }))

    // Peak hour
    const hourMap = Array(24).fill(0)
    all.forEach(o => { hourMap[new Date(o.created_at).getHours()] += 1 })
    const peakHour = hourMap.indexOf(Math.max(...hourMap))

    // Avg response
    const respTimes = all.filter(o => o.vendor_response_secs > 0).map(o => o.vendor_response_secs)
    const avgResponse = respTimes.length ? Math.round(respTimes.reduce((s,v)=>s+v,0) / respTimes.length) : null

    const totalRevenue  = all.reduce((s,o) => s + Number(o.subtotal || o.total_amount || 0), 0)
    const avgOrderValue = all.length ? totalRevenue / all.length : 0

    setData({ totalRevenue, totalOrders: all.length, avgOrderValue, daily, topItems, topItemsChart, peakHour, avgResponse })
    setLoading(false)
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title">📊 Analytics</h1>
          {vendor && <p className="page-subtitle">{vendor.name}</p>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['7','7 days'],['30','30 days'],['90','90 days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'7px 14px', borderRadius:99, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background:range===v?'var(--poa-green)':'var(--bg-elevated)', color:range===v?'#fff':'var(--text-secondary)' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', gap:8, alignItems:'center', padding:40, color:'var(--text-muted)' }}><div className="spinner"/>Loading analytics...</div>
      ) : !data || !vendor ? (
        <div className="empty-state"><p style={{ fontWeight:600 }}>No data yet</p><p style={{ fontSize:13, marginTop:4 }}>Complete some orders to see your analytics</p></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="stat-grid" style={{ marginBottom:20 }}>
            {[
              ['Revenue', formatCurrency(data.totalRevenue), 'var(--poa-green-dark)'],
              ['Delivered', data.totalOrders, null],
              ['Avg order', formatCurrency(data.avgOrderValue), null],
              ['Avg response', data.avgResponse ? `${Math.floor(data.avgResponse/60)}m ${data.avgResponse%60}s` : 'N/A', null],
            ].map(([l,v,c]) => (
              <div key={l} className="stat-card">
                <div className="stat-value" style={{ fontSize:20, color:c||'var(--text-primary)' }}>{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          {/* Revenue + orders bar chart */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>Daily revenue & order count</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.daily} margin={{ top:4, right:16, left:0, bottom:28 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize:11, fill:'var(--text-muted)' }}
                  angle={-35} textAnchor="end"
                  interval={Number(range) > 14 ? Math.floor(Number(range)/7) : 0}
                />
                <YAxis
                  yAxisId="rev" orientation="left"
                  tick={{ fontSize:11, fill:'var(--text-muted)' }}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  width={48}
                />
                <YAxis
                  yAxisId="ord" orientation="right"
                  tick={{ fontSize:11, fill:'var(--text-muted)' }}
                  allowDecimals={false} width={28}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize:12, paddingTop:4 }}
                  formatter={name => name === 'revenue' ? 'Revenue (KES)' : 'Orders'}
                />
                <Bar yAxisId="rev" dataKey="revenue" name="revenue" fill="#00C566" radius={[4,4,0,0]} maxBarSize={36} />
                <Bar yAxisId="ord" dataKey="orders"  name="orders"  fill="#3B82F6" radius={[4,4,0,0]} maxBarSize={18} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top items horizontal chart */}
          {data.topItemsChart.length > 0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>🏆 Top selling items</div>
              <ResponsiveContainer width="100%" height={Math.max(160, data.topItemsChart.length * 42)}>
                <BarChart
                  data={data.topItemsChart} layout="vertical"
                  margin={{ top:0, right:64, left:0, bottom:0 }} barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'var(--text-primary)' }} width={140} />
                  <Tooltip formatter={(v, name) => name === 'sold' ? [`${v} units`, 'Sold'] : [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="sold" name="sold" fill="#00C566" radius={[0,4,4,0]} maxBarSize={20} label={{ position:'right', fontSize:11, fill:'var(--text-muted)', formatter: v => `${v}×` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Peak hour + response time */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>⏰ Peak hour</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:800, color:'var(--poa-green)' }}>
                {data.peakHour}:00
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                Busiest between {data.peakHour}:00–{data.peakHour+1}:00
              </div>
            </div>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>⚡ Avg response</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:800, color: data.avgResponse && data.avgResponse < 180 ? 'var(--poa-green)' : 'var(--poa-orange)' }}>
                {data.avgResponse ? `${Math.floor(data.avgResponse/60)}m` : 'N/A'}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Time to confirm orders</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
