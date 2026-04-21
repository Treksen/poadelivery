import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils'
import { Search, X, Store, UtensilsCrossed } from 'lucide-react'

export default function GlobalSearch({ onClose }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ vendors: [], items: [] })
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef(null)
  const navigate              = useNavigate()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults({ vendors: [], items: [] }); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const [{ data: vendors }, { data: items }] = await Promise.all([
        supabase.from('vendors').select('id,name,category,address,rating,delivery_time').ilike('name', `%${query}%`).eq('is_active', true).limit(5),
        supabase.from('menu_items').select('id,name,description,price,vendor_id,vendors(id,name)').ilike('name', `%${query}%`).eq('is_available', true).limit(10),
      ])
      setResults({ vendors: vendors || [], items: items || [] })
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const go = (path) => { navigate(path); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '0 0 16px 16px', padding: '16px', maxWidth: 600, margin: '0 auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search restaurants or food items..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>}

          {!loading && results.vendors.length === 0 && results.items.length === 0 && query.length >= 2 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No results for "{query}"</p>
            </div>
          )}

          {results.vendors.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '8px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Restaurants</div>
              {results.vendors.map(v => (
                <div key={v.id} onClick={() => go(`/customer/vendor/${v.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', cursor: 'pointer', borderRadius: 8 }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--poa-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Store size={16} style={{ color: 'var(--poa-green)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.address} · {v.delivery_time} min</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {results.items.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '12px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Menu Items</div>
              {results.items.map(item => (
                <div key={item.id} onClick={() => go(`/customer/vendor/${item.vendor_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', cursor: 'pointer', borderRadius: 8 }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UtensilsCrossed size={16} style={{ color: 'var(--poa-orange)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.vendors?.name}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--poa-green-dark)', fontSize: 13 }}>{formatCurrency(item.price)}</div>
                </div>
              ))}
            </>
          )}

          {query.length === 0 && (
            <div style={{ padding: '24px 4px', color: 'var(--text-muted)', fontSize: 14 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Try searching for:</p>
              {['Nyama choma', 'Pilau', 'Chapati', 'Burger', 'Coffee'].map(s => (
                <span key={s} onClick={() => setQuery(s)} style={{ display: 'inline-block', margin: '4px 4px 4px 0', padding: '5px 12px', background: 'var(--bg-elevated)', borderRadius: 99, cursor: 'pointer', fontSize: 13 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
