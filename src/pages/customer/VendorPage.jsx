import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils'
import { ArrowLeft, Plus, Minus, ShoppingCart, Star, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VendorPage() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const [vendor, setVendor]       = useState(null)
  const [categories, setCategories] = useState([])
  const [items, setItems]         = useState([])
  const [cart, setCart]           = useState({})  // { item_id: quantity }
  const [activeCategory, setActiveCategory] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('*').eq('id', id).single(),
      supabase.from('menu_categories').select('*').eq('vendor_id', id).order('sort_order'),
      supabase.from('menu_items').select('*').eq('vendor_id', id).eq('is_available', true),
    ]).then(([{ data: v }, { data: cats }, { data: its }]) => {
      setVendor(v)
      setCategories(cats || [])
      setItems(its || [])
      setActiveCategory(cats?.[0]?.id || null)
      setLoading(false)
    })
  }, [id])

  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const next = { ...prev, [itemId]: (prev[itemId] || 0) + delta }
      if (next[itemId] <= 0) delete next[itemId]
      return next
    })
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((total, [itemId, qty]) => {
    const item = items.find(i => i.id === itemId)
    return total + (item?.price || 0) * qty
  }, 0)

  const goToCheckout = () => {
    if (cartCount === 0) return
    const cartItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = items.find(i => i.id === itemId)
      return { ...item, quantity: qty }
    })
    localStorage.setItem('poa_cart', JSON.stringify({ vendor, items: cartItems }))
    navigate('/customer/checkout')
  }

  const filteredItems = activeCategory ? items.filter(i => i.category_id === activeCategory) : items

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!vendor) return <div className="page"><p>Vendor not found</p></div>

  return (
    <div>
      {/* Cover */}
      <div style={{ height: 200, background: 'var(--poa-green)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>
        {vendor.category === 'restaurant' ? '🍽️' : vendor.category === 'cafe' ? '☕' : '🛒'}
        <button onClick={() => navigate(-1)} className="btn-icon" style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)' }}>
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="page">
        {/* Vendor info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{vendor.name}</h1>
            <span className={`badge ${vendor.is_open ? 'badge-green' : 'badge-gray'}`}>{vendor.is_open ? 'Open' : 'Closed'}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{vendor.description}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={13} fill="#F59E0B" style={{ color: '#F59E0B' }} />{vendor.rating || '4.5'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} />{vendor.delivery_time || 30} min</span>
            <span>Min. {formatCurrency(vendor.min_order || 0)}</span>
          </div>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)}
                style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, background: activeCategory === c.id ? 'var(--poa-green)' : 'var(--bg-elevated)', color: activeCategory === c.id ? '#fff' : 'var(--text-secondary)' }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu items */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
              <p style={{ fontWeight: 600 }}>No menu items yet</p>
              <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
                Run migration 004_seed_menu_items.sql in Supabase SQL Editor
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="menu-item-card">
                <div className="menu-item-img" style={{ background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> : '🍴'}
                </div>
                <div className="menu-item-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="menu-item-name">{item.name}</div>
                    {item.is_popular && <span className="badge badge-orange" style={{ fontSize: 9 }}>Popular</span>}
                  </div>
                  <div className="menu-item-desc">{item.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div className="menu-item-price">{formatCurrency(item.price)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {cart[item.id] > 0 && (
                        <>
                          <button className="cart-btn" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} onClick={() => updateCart(item.id, -1)}><Minus size={14} /></button>
                          <span className="cart-qty">{cart[item.id]}</span>
                        </>
                      )}
                      <button className="cart-btn" onClick={() => updateCart(item.id, 1)}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px 12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', zIndex: 200 }}>
          <button onClick={goToCheckout} className="btn btn-primary btn-full btn-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 13 }}>{cartCount}</span>
            <span>View cart</span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
