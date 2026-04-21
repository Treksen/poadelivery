import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

export function useFavourites() {
  const { profile } = useAuth()
  const [favs, setFavs] = useState(new Set())

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('favourites').select('vendor_id').eq('user_id', profile.id)
      .then(({ data }) => setFavs(new Set((data || []).map(f => f.vendor_id))))
  }, [profile?.id])

  const toggle = async (vendorId) => {
    if (!profile?.id) return
    if (favs.has(vendorId)) {
      await supabase.from('favourites').delete().eq('user_id', profile.id).eq('vendor_id', vendorId)
      setFavs(p => { const n = new Set(p); n.delete(vendorId); return n })
      toast.success('Removed from favourites')
    } else {
      await supabase.from('favourites').insert({ user_id: profile.id, vendor_id: vendorId })
      setFavs(p => new Set([...p, vendorId]))
      toast.success('Added to favourites ❤️')
    }
  }

  return { favs, toggle }
}

export function FavouriteButton({ vendorId, size = 18 }) {
  const { favs, toggle } = useFavourites()
  const isFav = favs.has(vendorId)
  return (
    <button onClick={e => { e.stopPropagation(); toggle(vendorId) }}
      style={{ background: isFav ? '#FEE2E2' : 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Heart size={size} fill={isFav ? '#EF4444' : 'none'} style={{ color: isFav ? '#EF4444' : '#6B7280' }} />
    </button>
  )
}

export default function FavouritesPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const { toggle } = useFavourites()

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('favourites').select('vendor_id, vendors(*)').eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setVendors((data || []).map(f => f.vendors).filter(Boolean)); setLoading(false) })
  }, [profile?.id])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">❤️ Favourites</h1>
        <p className="page-subtitle">{vendors.length} saved restaurants</p>
      </div>
      {loading ? <div className="flex gap-2"><div className="spinner"/>Loading...</div>
      : vendors.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} style={{ opacity: 0.2 }} />
          <p style={{ fontWeight: 600, marginTop: 12 }}>No favourites yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Tap the ❤️ on any restaurant to save it</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/customer')}>Browse restaurants</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
          {vendors.map(v => (
            <div key={v.id} className="vendor-card" onClick={() => navigate(`/customer/vendor/${v.id}`)}>
              <div className="vendor-cover" style={{ background: '#E6FFF3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
                🍽️
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <FavouriteButton vendorId={v.id} />
                </div>
              </div>
              <div className="vendor-info">
                <div className="vendor-name">{v.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{v.address}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
