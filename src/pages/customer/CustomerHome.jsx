import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Search, Star, Clock, Heart, Globe, Moon, Sun } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import { FavouriteButton } from './Favourites'
import { useSettings } from '../../hooks/useSettings'

const CATEGORIES = ['All', 'Restaurant', 'Cafe', 'Bakery', 'Grocery', 'Pharmacy']
const COVER_COLORS = ['#FF6B35', '#00C566', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899']

export default function CustomerHome() {
  const [vendors, setVendors]   = useState([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading]   = useState(true)
  const { profile }             = useAuth()
  const navigate                = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const { theme, toggleTheme, lang, toggleLang } = useSettings()

  const [vendorError, setVendorError] = useState(null)

  useEffect(() => {
    // Hard 8-second timeout so it never spins forever
    const timer = setTimeout(() => {
      setLoading(false)
      setVendorError('Request timed out. Check your Supabase URL and anon key in .env.local')
    }, 8000)

    supabase.from('vendors').select('*')
      .then(({ data, error }) => {
        clearTimeout(timer)
        if (error) {
          console.error('Vendors error:', error)
          setVendorError(error.message)
        } else {
          setVendors(data || [])
        }
        setLoading(false)
      })
      .catch(err => {
        clearTimeout(timer)
        console.error('Vendors fetch failed:', err)
        setVendorError(err.message)
        setLoading(false)
      })

    return () => clearTimeout(timer)
  }, [])

  const filtered = vendors.filter(v =>
    (category === 'All' || v.category === category.toLowerCase()) &&
    (!search || v.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {profile?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>What would you like to eat today?</p>
      </div>

      {/* Settings bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'flex-end' }}>
        <button onClick={toggleLang} style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
          <Globe size={13} /> {lang === 'en' ? 'SW' : 'EN'}
        </button>
        <button onClick={toggleTheme} style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />} {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form-input" placeholder="Search restaurants, food..." value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setShowSearch(true)}
          style={{ paddingLeft: 38 }} />
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: category === c ? 'var(--poa-green)' : 'var(--bg-elevated)', color: category === c ? '#fff' : 'var(--text-secondary)' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Promo banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--poa-dark) 0%, #1a2744 100%)', borderRadius: 'var(--radius-xl)', padding: '20px 24px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--poa-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Limited offer</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', marginTop: 4 }}>Free delivery on<br />your first order!</div>
          <button style={{ marginTop: 12, padding: '8px 16px', background: 'var(--poa-green)', color: '#fff', border: 'none', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Order now</button>
        </div>
        <div style={{ fontSize: 56 }}>🍔</div>
      </div>

      {/* Vendors grid */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          {search ? `Results for "${search}"` : category === 'All' ? 'All restaurants' : category}
          <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({filtered.length})</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted"><div className="spinner" /> Loading restaurants...</div>
      ) : vendorError ? (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Could not load restaurants</div>
          <div style={{ fontSize: 13, color: '#7F1D1D' }}>{vendorError}</div>
          <div style={{ fontSize: 12, color: '#991B1B', marginTop: 8 }}>
            Check: 1) VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local are correct
            2) Run migration 003_fix_vendors_rls.sql in Supabase SQL Editor
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No restaurants found — run migration 003 in Supabase SQL Editor</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
          {filtered.map((v, i) => (
            <div key={v.id} className="vendor-card" onClick={() => navigate(`/customer/vendor/${v.id}`)}>
              <div className="vendor-cover" style={{ background: v.cover_url ? undefined : COVER_COLORS[i % COVER_COLORS.length] }}>
                {v.cover_url && <img src={v.cover_url} alt={v.name} />}
                {!v.cover_url && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>
                    {v.category === 'restaurant' ? '🍽️' : v.category === 'cafe' ? '☕' : v.category === 'grocery' ? '🛒' : '🍴'}
                  </div>
                )}
              </div>
              <div className="vendor-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="vendor-name">{v.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${v.is_open ? 'badge-green' : 'badge-gray'}`}>{v.is_open ? 'Open' : 'Closed'}</span>
                    <FavouriteButton vendorId={v.id} size={14} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{v.description?.slice(0, 60)}...</div>
                <div className="vendor-meta" style={{ marginTop: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Star size={11} fill="currentColor" style={{ color: '#F59E0B' }} />{v.rating || '4.5'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{v.delivery_time || 30} min</span>
                  <span>Min. KES {v.min_order || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
