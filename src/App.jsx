import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { formatCurrency } from './utils'
import AppShell from './components/shared/AppShell'
import './styles/main.css'

import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import SignupPage     from './pages/SignupPage'
import CustomerHome   from './pages/customer/CustomerHome'
import VendorPage     from './pages/customer/VendorPage'
import CheckoutPage   from './pages/customer/CheckoutPage'
import CustomerOrders from './pages/customer/CustomerOrders'
import TrackOrderPage from './pages/customer/TrackOrderPage'
import RiderDashboard  from './pages/rider/RiderDashboard'
import RiderActiveOrder from './pages/rider/RiderActiveOrder'
import { RiderOrders, RiderEarnings } from './pages/rider/RiderOrders'
import VendorDashboard from './pages/vendor/VendorDashboard'
import VendorMenu      from './pages/vendor/VendorMenu'
import { VendorOrders, VendorSettings } from './pages/vendor/VendorOrders'
import AdminDashboard from './pages/admin/AdminDashboard'
import { AdminOrders, AdminRiders, AdminVendors, AdminPricing } from './pages/admin/AdminPages'
import AdminSettings  from './pages/admin/AdminSettings'
import FavouritesPage from './pages/customer/Favourites'
import ReviewPage from './pages/customer/ReviewPage'
import DisputePage from './pages/customer/DisputePage'
import LoyaltyPage from './pages/customer/LoyaltyPage'
import VendorAnalytics from './pages/vendor/VendorAnalytics'
import { VendorHours, VendorDiscounts } from './pages/vendor/VendorHoursDiscounts'
import PayoutPage from './pages/rider/PayoutPage'
import AdminLiveMap from './pages/admin/AdminLiveMap'
import AdminPromos from './pages/admin/AdminPromos'
import AdminUsers     from './pages/admin/AdminUsers'

const ROLE_HOME = { customer: '/customer', rider: '/rider', vendor: '/vendor', admin: '/admin' }

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  // Only show spinner on initial load — not on token refreshes
  if (loading) return <Spinner />

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />

  // Wrong role → go to correct dashboard
  const role = profile?.role || 'customer'
  if (roles && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/customer'} replace />
  }

  return children
}

function Spinner() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 14 }}>Loading Poa...</p>
    </div>
  )
}

function TrackOrdersList() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!profile?.id) return
    supabase.from('orders').select('*, vendors(name)').eq('customer_id', profile.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [profile?.id])
  const STATUS_BADGE = { pending:'badge-yellow',confirmed:'badge-blue',preparing:'badge-blue',ready:'badge-green',assigned:'badge-blue',picked_up:'badge-orange',in_transit:'badge-orange',delivered:'badge-green',cancelled:'badge-red' }
  const ACTIVE = ['pending','confirmed','preparing','ready','assigned','picked_up','in_transit']
  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">My Orders</h1></div>
      {loading ? <div style={{ display:'flex',gap:8 }}><div className="spinner"/>Loading...</div>
      : orders.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize:48 }}>📦</div>
          <p style={{ fontWeight:600,marginTop:12 }}>No orders yet</p>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/customer')}>Browse restaurants</button>
        </div>
      ) : orders.map(o => (
        <div key={o.id} className="card" style={{ marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${o.status==='delivered'?'var(--poa-green)':ACTIVE.includes(o.status)?'var(--poa-orange)':'var(--border)'}` }}
          onClick={() => navigate(`/customer/track/${o.id}`)}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
            <div><div style={{ fontWeight:700 }}>{o.vendors?.name}</div><div style={{ fontSize:12,color:'var(--text-muted)' }}>{o.order_number}</div></div>
            <span className={`badge ${STATUS_BADGE[o.status]||'badge-gray'}`}>{o.status?.replace(/_/g,' ')}</span>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between' }}>
            <span style={{ fontSize:13,color:'var(--text-muted)' }}>{o.dropoff_address?.slice(0,40)}</span>
            <span style={{ fontWeight:700 }}>{formatCurrency(o.total_amount)}</span>
          </div>
          {ACTIVE.includes(o.status) && <button className="btn btn-primary btn-sm" style={{ marginTop:8 }} onClick={e=>{e.stopPropagation();navigate(`/customer/track/${o.id}`)}}>Track live →</button>}
        </div>
      ))}
    </div>
  )
}

function ProfilePage() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [riderProfile, setRiderProfile] = useState(null)
  const [vendorProfile, setVendorProfile] = useState(null)
  const [orderCount, setOrderCount] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    // Load role-specific extra data
    if (profile.role === 'rider') {
      supabase.from('rider_profiles').select('*').eq('id', profile.id).maybeSingle()
        .then(({ data }) => setRiderProfile(data))
    }
    if (profile.role === 'vendor') {
      supabase.from('vendors').select('*').eq('owner_id', profile.id).maybeSingle()
        .then(({ data }) => setVendorProfile(data))
    }
    if (profile.role === 'customer') {
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', profile.id)
        .then(({ count }) => setOrderCount(count || 0))
    }
  }, [profile?.id])

  const handleSignOut = async () => {
    try { if (typeof signOut === 'function') await signOut() } catch (_) {}
    try { localStorage.removeItem('poa-auth') } catch (_) {}
    navigate('/')
  }

  const ROLE_COLORS = { customer: '#00C566', rider: '#3B82F6', vendor: '#F59E0B', admin: '#8B5CF6' }
  const color = ROLE_COLORS[profile?.role] || '#00C566'

  return (
    <div className="page" style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">Profile</h1></div>

      {/* Avatar + name */}
      <div className="card" style={{ marginBottom: 12, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px',
          background: color + '20', color, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 28,
        }}>
          {profile?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{profile?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{profile?.email}</div>
        <span style={{ padding: '4px 14px', borderRadius: 99, background: color + '18', color, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
          {profile?.role}
        </span>
      </div>

      {/* Details */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Account details
        </div>

        {[
          ['📧', 'Email', profile?.email],
          profile?.phone ? ['📞', 'Phone', profile.phone] : null,
          ['🎭', 'Role', profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)],
          profile?.role === 'customer' && orderCount !== null ? ['📦', 'Total orders', orderCount] : null,
        ].filter(Boolean).map(([icon, label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{icon} {label}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Rider extra info */}
      {profile?.role === 'rider' && riderProfile && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Rider details
          </div>
          {[
            ['🏍️', 'Vehicle', riderProfile.vehicle_type],
            riderProfile.vehicle_plate ? ['🔢', 'Plate', riderProfile.vehicle_plate] : null,
            ['📦', 'Total deliveries', riderProfile.total_deliveries || 0],
            ['💰', 'Total earned', `KES ${Number(riderProfile.total_earned || 0).toLocaleString()}`],
            ['⭐', 'Rating', riderProfile.rating || 'Not rated yet'],
            ['🟢', 'Status', riderProfile.is_online ? 'Online' : 'Offline'],
          ].filter(Boolean).map(([icon, label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{icon} {label}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Vendor extra info */}
      {profile?.role === 'vendor' && vendorProfile && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Restaurant details
          </div>
          {[
            ['🍽️', 'Restaurant', vendorProfile.name],
            ['📍', 'Address', vendorProfile.address],
            ['🏷️', 'Category', vendorProfile.category],
            ['⭐', 'Rating', vendorProfile.rating || 'No ratings yet'],
            ['🕐', 'Delivery time', `${vendorProfile.delivery_time} mins`],
            ['🟢', 'Status', vendorProfile.is_open ? 'Open' : 'Closed'],
          ].map(([icon, label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{icon} {label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sign out */}
      <button onClick={handleSignOut} style={{
        width: '100%', padding: '15px', borderRadius: 10, border: 'none',
        background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 15,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 4,
      }}>
        ↩ Sign out
      </button>
    </div>
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Only redirect away from public pages — NEVER redirect if already inside the app
  const isPublicPath = ['/', '/login', '/signup'].includes(location.pathname)
  if (!loading && user && profile && isPublicPath) {
    return <Navigate to={ROLE_HOME[profile.role] || '/customer'} replace />
  }

  return (
    <Routes>
      <Route path="/"       element={<LandingPage />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/customer"            element={<ProtectedRoute roles={['customer']}><AppShell><CustomerHome /></AppShell></ProtectedRoute>} />
      <Route path="/customer/vendor/:id" element={<ProtectedRoute roles={['customer']}><AppShell><VendorPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/checkout"   element={<ProtectedRoute roles={['customer']}><AppShell><CheckoutPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/orders"     element={<ProtectedRoute roles={['customer']}><AppShell><CustomerOrders /></AppShell></ProtectedRoute>} />
      <Route path="/customer/track"      element={<ProtectedRoute roles={['customer']}><AppShell><TrackOrdersList /></AppShell></ProtectedRoute>} />
      <Route path="/customer/track/:id"  element={<ProtectedRoute roles={['customer']}><AppShell><TrackOrderPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/favourites" element={<ProtectedRoute roles={['customer']}><AppShell><FavouritesPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/loyalty"     element={<ProtectedRoute roles={['customer']}><AppShell><LoyaltyPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/review/:id"  element={<ProtectedRoute roles={['customer']}><AppShell><ReviewPage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/dispute/:id" element={<ProtectedRoute roles={['customer']}><AppShell><DisputePage /></AppShell></ProtectedRoute>} />
      <Route path="/customer/profile"    element={<ProtectedRoute roles={['customer']}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

      <Route path="/rider"            element={<ProtectedRoute roles={['rider']}><AppShell><RiderDashboard /></AppShell></ProtectedRoute>} />
      <Route path="/rider/orders"     element={<ProtectedRoute roles={['rider']}><AppShell><RiderOrders /></AppShell></ProtectedRoute>} />
      <Route path="/rider/orders/:id" element={<ProtectedRoute roles={['rider']}><AppShell><RiderActiveOrder /></AppShell></ProtectedRoute>} />
      <Route path="/rider/earnings"   element={<ProtectedRoute roles={['rider']}><AppShell><RiderEarnings /></AppShell></ProtectedRoute>} />
      <Route path="/rider/payout"   element={<ProtectedRoute roles={['rider']}><AppShell><PayoutPage /></AppShell></ProtectedRoute>} />
      <Route path="/rider/profile"    element={<ProtectedRoute roles={['rider']}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

      <Route path="/vendor"          element={<ProtectedRoute roles={['vendor']}><AppShell><VendorDashboard /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/orders"   element={<ProtectedRoute roles={['vendor']}><AppShell><VendorOrders /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/menu"     element={<ProtectedRoute roles={['vendor']}><AppShell><VendorMenu /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/settings" element={<ProtectedRoute roles={['vendor']}><AppShell><VendorSettings /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/analytics"  element={<ProtectedRoute roles={['vendor']}><AppShell><VendorAnalytics /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/hours"       element={<ProtectedRoute roles={['vendor']}><AppShell><VendorHours /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/discounts"   element={<ProtectedRoute roles={['vendor']}><AppShell><VendorDiscounts /></AppShell></ProtectedRoute>} />
      <Route path="/vendor/profile"  element={<ProtectedRoute roles={['vendor']}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

      <Route path="/admin"           element={<ProtectedRoute roles={['admin']}><AppShell><AdminDashboard /></AppShell></ProtectedRoute>} />
      <Route path="/admin/orders"    element={<ProtectedRoute roles={['admin']}><AppShell><AdminOrders /></AppShell></ProtectedRoute>} />
      <Route path="/admin/riders"    element={<ProtectedRoute roles={['admin']}><AppShell><AdminRiders /></AppShell></ProtectedRoute>} />
      <Route path="/admin/vendors"   element={<ProtectedRoute roles={['admin']}><AppShell><AdminVendors /></AppShell></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute roles={['admin']}><AppShell><AdminUsers /></AppShell></ProtectedRoute>} />
      <Route path="/admin/users"     element={<ProtectedRoute roles={['admin']}><AppShell><AdminUsers /></AppShell></ProtectedRoute>} />
      <Route path="/admin/pricing"   element={<ProtectedRoute roles={['admin']}><AppShell><AdminPricing /></AppShell></ProtectedRoute>} />
      <Route path="/admin/settings"  element={<ProtectedRoute roles={['admin']}><AppShell><AdminSettings /></AppShell></ProtectedRoute>} />
      <Route path="/admin/livemap"   element={<ProtectedRoute roles={['admin']}><AppShell><AdminLiveMap /></AppShell></ProtectedRoute>} />
      <Route path="/admin/promos"    element={<ProtectedRoute roles={['admin']}><AppShell><AdminPromos /></AppShell></ProtectedRoute>} />
      <Route path="/admin/profile"   element={<ProtectedRoute roles={['admin']}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { fontFamily:'var(--font-body)',fontSize:14 } }} />
      </AuthProvider>
    </BrowserRouter>
  )
}
