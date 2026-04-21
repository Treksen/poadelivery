import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TAB_DATA = {
  customer: {
    icon: '🛒', color: '#00C566', label: 'Customers',
    headline: 'Nairobi street food, delivered to your door',
    sub: 'Order from the best local restaurants, track your rider on a live map, and pay with M-Pesa — all in one place.',
    features: [
      ['🍽️','Kenyan favourites','Nyama choma, pilau, mandazi, chapati and much more from verified local chefs.'],
      ['📍','100 pickup points','Choose from 100 delivery points along Thika Road and across Nairobi, or use your GPS.'],
      ['🗺️','Live rider tracking','Watch your rider move on the map in real time. Updates every 20 seconds.'],
      ['⚡','Fast delivery','Average 35 minutes from order confirmation to your door.'],
      ['📱','Pay with M-Pesa','M-Pesa, cash or card — pay the way that works for you.'],
      ['⭐','Rate your meal','Leave a review after each order and help your favourite spots grow.'],
    ],
    cta: 'Order food now',
    login: 'Already have an account? Log in',
  },
  rider: {
    icon: '🏍️', color: '#111827', label: 'Riders',
    headline: 'Earn money on your schedule',
    sub: 'Join Nairobi\'s delivery fleet. Go online when you want, accept orders near you, and get paid per delivery.',
    features: [
      ['💰','Earn per delivery','Keep your delivery fee on every order. More earnings during surge hours.'],
      ['🕐','Flexible hours','No shifts, no obligations. Go online and offline at the tap of a button.'],
      ['🛰️','Smart matching','Orders are assigned by proximity — no long detours, more deliveries per hour.'],
      ['📊','Earnings tracker','Daily, weekly and all-time earnings in your dashboard.'],
      ['🗺️','Route map','Live map shows pickup and dropoff. Your GPS trail is recorded automatically.'],
      ['🔔','Instant alerts','New orders appear the moment you\'re online. One tap to accept.'],
    ],
    cta: 'Become a rider',
    login: 'Already riding with us? Log in',
  },
  vendor: {
    icon: '🍽️', color: '#00C566', label: 'Vendors',
    headline: 'List your restaurant. Reach all of Nairobi.',
    sub: 'Publish your menu, receive orders in real time and let our rider network handle delivery. You focus on the food.',
    features: [
      ['📋','Simple menu builder','Add categories, items and prices in minutes. Update availability instantly.'],
      ['🔔','Real-time orders','New orders appear live on your dashboard. Confirm and prepare with one click.'],
      ['📍','On the map','Your restaurant is pinned and visible to all customers across Nairobi.'],
      ['📊','Revenue dashboard','Track today\'s orders, revenue and top-selling items at a glance.'],
      ['🏍️','Delivery handled','Our verified rider network handles all deliveries. No logistics needed.'],
      ['🌍','Nairobi-wide reach','Customers from all 100 delivery zones can discover and order from you.'],
    ],
    cta: 'Register your restaurant',
    login: 'Already registered? Log in',
  },
}

export default function LandingPage() {
  const [tab, setTab] = useState('customer')
  const navigate      = useNavigate()
  const t             = TAB_DATA[tab]

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111827' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff', zIndex: 100 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#00C566', letterSpacing: '-0.5px' }}>Poa Delivery</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>Log in</button>
          <button onClick={() => navigate('/signup')} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C566', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, letterSpacing: '0.06em' }}>NOW LIVE IN NAIROBI</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20, color: '#0D1117' }}>
            Street food,<br />delivered <span style={{ color: '#00C566' }}>fast.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#6B7280', lineHeight: 1.75, marginBottom: 36, maxWidth: 420 }}>
            Order from Nairobi's best local restaurants. Track your rider live. Pay with M-Pesa. Average delivery: 35 minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signup?role=customer')} style={{ padding: '14px 28px', borderRadius: 10, border: 'none', background: '#00C566', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>Order food now →</button>
            <button onClick={() => document.getElementById('who').scrollIntoView({ behavior:'smooth' })} style={{ padding: '14px 28px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: 'inherit' }}>Learn more</button>
          </div>
        </div>
        {/* Hero visual */}
        <div style={{ background: 'linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%)', borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { emoji: '🍖', title: 'Nyama Choma & Ugali', rest: "Mama's Kitchen", time: '22 min', status: 'On the way' },
            { emoji: '🥟', title: 'Samosa (6 pcs)', rest: 'Nairobi Bites', time: '18 min', status: 'Preparing' },
            { emoji: '☕', title: 'Kenyan AA Coffee', rest: 'Kahawa Cafe', time: '14 min', status: 'Delivered ✓' },
          ].map((o, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 28 }}>{o.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{o.title}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{o.rest}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: o.status.includes('✓') ? '#16A34A' : '#374151' }}>{o.status}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{o.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 48px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#F3F4F6', borderRadius: 16, overflow: 'hidden' }}>
          {[['100+','Delivery points'],['3','Partner restaurants'],['~35 min','Avg delivery time'],['24/7','Order anytime']].map(([v,l]) => (
            <div key={l} style={{ background: '#fff', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: '#0D1117' }}>{v}</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is Poa for? */}
      <div id="who" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 10, color: '#0D1117' }}>Built for everyone</h2>
          <p style={{ color: '#9CA3AF', fontSize: 16 }}>One platform — customers, riders, and restaurants</p>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', background: '#F9FAFB', borderRadius: 12, padding: 5, gap: 4, border: '1px solid #F3F4F6' }}>
            {Object.entries(TAB_DATA).map(([key, d]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '10px 28px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#0D1117' : '#9CA3AF', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 52, marginBottom: 20 }}>{t.icon}</div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 14, color: '#0D1117' }}>{t.headline}</h3>
            <p style={{ color: '#6B7280', fontSize: 16, lineHeight: 1.75, marginBottom: 36 }}>{t.sub}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => navigate(`/signup?role=${tab}`)} style={{ padding: '14px 24px', borderRadius: 10, border: 'none', background: t.color, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>
                {t.cta} →
              </button>
              <button onClick={() => navigate('/login')} style={{ padding: '13px 24px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}>
                {t.login}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {t.features.map(([icon, title, desc], i) => (
              <div key={i} style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '18px 16px' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: '#111827' }}>{title}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: '#0D1117', padding: '72px 48px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 14 }}>Join Poa Delivery today</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, marginBottom: 40 }}>Free to sign up. No commitments.</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['customer','🛒 Order food','#00C566','#fff'],['rider','🏍️ Become a rider','#fff','#0D1117'],['vendor','🍽️ List restaurant','rgba(255,255,255,0.08)','#fff']].map(([role,label,bg,fg]) => (
            <button key={role} onClick={() => navigate(`/signup?role=${role}`)} style={{ padding: '13px 26px', borderRadius: 10, border: role === 'rider' ? 'none' : '1px solid rgba(255,255,255,0.12)', background: bg, color: fg, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #F3F4F6', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: '#00C566' }}>Poa Delivery</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>© 2026 Poa Delivery · Nairobi, Kenya</div>
      </div>

      <style>{`@media(max-width:768px){
        div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important}
        div[style*="grid-template-columns: repeat(4"]{grid-template-columns:repeat(2,1fr)!important}
        nav{padding:16px 20px!important}
      }`}</style>
    </div>
  )
}
