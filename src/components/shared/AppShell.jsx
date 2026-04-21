import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, ShoppingBag, MapPin, User, LogOut,
  ChefHat, Truck, Settings, ClipboardList, BarChart2,
  Users, Store, Package, Heart, Star, Tag,
} from 'lucide-react'

const NAV = {
  customer: [
    { to: '/customer',            icon: LayoutDashboard, label: 'Home'       },
    { to: '/customer/orders',     icon: ShoppingBag,     label: 'Orders'     },
    { to: '/customer/track',      icon: MapPin,          label: 'Track'      },
    { to: '/customer/favourites', icon: Heart,           label: 'Favourites' },
    { to: '/customer/loyalty',    icon: Star,            label: 'Loyalty'    },
    { to: '/customer/profile',    icon: User,            label: 'Profile'    },
  ],
  rider: [
    { to: '/rider',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/rider/orders',    icon: Package,         label: 'Orders'    },
    { to: '/rider/earnings',  icon: BarChart2,       label: 'Earnings'  },
    { to: '/rider/payout',    icon: Truck,           label: 'Payouts'   },
    { to: '/rider/profile',   icon: User,            label: 'Profile'   },
  ],
  vendor: [
    { to: '/vendor',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vendor/orders',     icon: ClipboardList,   label: 'Orders'    },
    { to: '/vendor/menu',       icon: ChefHat,         label: 'Menu'      },
    { to: '/vendor/analytics',  icon: BarChart2,       label: 'Analytics' },
    { to: '/vendor/hours',      icon: Settings,        label: 'Hours'     },
    { to: '/vendor/discounts',  icon: Tag,             label: 'Discounts' },
    { to: '/vendor/settings',   icon: Settings,        label: 'Settings'  },
  ],
  admin: [
    { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/orders',    icon: ShoppingBag,     label: 'Orders'    },
    { to: '/admin/livemap',   icon: MapPin,          label: 'Live Map'  },
    { to: '/admin/vendors',   icon: Store,           label: 'Vendors'   },
    { to: '/admin/riders',    icon: Truck,           label: 'Riders'    },
    { to: '/admin/customers', icon: Users,           label: 'Users'     },
    { to: '/admin/promos',    icon: Tag,             label: 'Promos'    },
    { to: '/admin/pricing',   icon: BarChart2,       label: 'Pricing'   },
    { to: '/admin/settings',  icon: Settings,        label: 'Settings'  },
  ],
}

// Bottom nav — 4 items per role, last is always Profile
const BOTTOM_NAV = {
  customer: [
    { to: '/customer',         icon: LayoutDashboard, label: 'Home'    },
    { to: '/customer/orders',  icon: ShoppingBag,     label: 'Orders'  },
    { to: '/customer/track',   icon: MapPin,          label: 'Track'   },
    { to: '/customer/profile', icon: User,            label: 'Profile' },
  ],
  rider: [
    { to: '/rider',           icon: LayoutDashboard, label: 'Home'     },
    { to: '/rider/orders',    icon: Package,         label: 'Orders'   },
    { to: '/rider/earnings',  icon: BarChart2,       label: 'Earnings' },
    { to: '/rider/profile',   icon: User,            label: 'Profile'  },
  ],
  vendor: [
    { to: '/vendor',          icon: LayoutDashboard, label: 'Home'    },
    { to: '/vendor/orders',   icon: ClipboardList,   label: 'Orders'  },
    { to: '/vendor/menu',     icon: ChefHat,         label: 'Menu'    },
    { to: '/vendor/profile',  icon: User,            label: 'Profile' },
  ],
  admin: [
    { to: '/admin',           icon: LayoutDashboard, label: 'Home'    },
    { to: '/admin/orders',    icon: ShoppingBag,     label: 'Orders'  },
    { to: '/admin/customers', icon: Users,           label: 'Users'   },
    { to: '/admin/profile',   icon: User,            label: 'Profile' },
  ],
}

const isActive = (to, current) => {
  if (to === current) return true
  // Only match sub-paths for non-dashboard routes
  if (to.split('/').length <= 2) return false  // e.g. /admin, /customer — exact only
  return current.startsWith(to + '/')
}

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role      = profile?.role || 'customer'
  const navItems  = NAV[role]    || NAV.customer
  const bottomNav = BOTTOM_NAV[role] || BOTTOM_NAV.customer

  const handleSignOut = async () => {
    try {
      if (typeof signOut === 'function') await signOut()
    } catch (_) {}
    navigate('/')
  }

  // Profile route for this role
  const profilePath = `/${role}/profile`

  return (
    <div className="app-shell">

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Poa Delivery</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{role}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className={`nav-item${isActive(to, location.pathname) ? ' active' : ''}`}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer with profile + logout */}
        <div className="sidebar-footer">
          {/* Profile card */}
          <Link to={profilePath} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              padding: '8px 10px', borderRadius: 8,
              background: isActive(profilePath, location.pathname) ? 'rgba(0,197,102,0.12)' : 'transparent',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,197,102,0.18)', color: 'var(--poa-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14,
              }}>
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.email}
                </div>
              </div>
            </div>
          </Link>

          {/* Sign out button */}
          <button onClick={handleSignOut} className="nav-item" style={{
            width: '100%', background: 'none', border: 'none',
            color: 'rgba(255,100,100,0.7)',
          }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {bottomNav.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className={`bottom-nav-item${isActive(to, location.pathname) ? ' active' : ''}`}>
              <Icon size={22} strokeWidth={isActive(to, location.pathname) ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>
  )
}
