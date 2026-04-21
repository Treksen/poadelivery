# 🚀 Poa Delivery

A complete food delivery platform built with React + Supabase + Google Maps.

## Features

### Customer
- Browse restaurants by category
- Add to cart, checkout with live price quote
- Distance-based pricing (base fare + per km + surge)
- Live rider tracking with 20-second polyline recording
- Order history and status tracking

### Rider
- Go online/offline toggle
- Accept available orders
- Navigate to pickup and dropoff
- GPS tracking every 20 seconds (polyline recorded)
- Earnings dashboard

### Vendor/Restaurant
- Real-time incoming orders dashboard
- Confirm → Preparing → Ready workflow
- Menu management (categories + items)
- Open/closed toggle

### Admin
- Full orders overview with cancel capability
- Rider management + verification
- Vendor activation/deactivation
- Live pricing configuration (base fare, per km, surge hours, multiplier)

---

## Setup

### 1. Clone and install
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_KEY=your-google-maps-key
```

### 3. Set up Supabase
1. Create a new Supabase project at supabase.com
2. Go to SQL Editor
3. Run `supabase/001_schema.sql`
4. Enable Realtime for tables: `orders`, `notifications`, `rider_pings`

### 4. Google Maps API
1. Go to console.cloud.google.com
2. Enable: Maps JavaScript API, Places API, Distance Matrix API
3. Create API key and add to `.env.local`
4. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `index.html`

### 5. Run
```bash
npm run dev
```

---

## How pricing works

```
Delivery fee = (base_fare + distance_km × per_km_rate) × surge_multiplier + service_fee
Minimum = min_fare
```

- **Base fare**: KES 50 (charged on every order)
- **Per km rate**: KES 30/km (uses Google Maps road distance, falls back to Haversine)
- **Surge pricing**: 1.5× multiplier from 17:00–20:00 Nairobi time
- **Service fee**: KES 20 flat (not affected by surge)
- **Minimum fare**: KES 80

All configurable in Admin → Pricing.

---

## How rider tracking works

1. Rider accepts order → presses "Start tracking"
2. Browser GPS `watchPosition()` fires continuously
3. Every **20 seconds** → `record_rider_ping()` RPC sends coordinates to Supabase
4. Ping appended to `orders.rider_polyline` (JSONB array)
5. Supabase Realtime broadcasts UPDATE to customer
6. Customer map redraws polyline in real time

---

## User roles

| Role | Access |
|------|--------|
| customer | Browse vendors, place orders, track delivery |
| rider | Accept orders, navigate, record GPS trail |
| vendor | Manage menu, handle incoming orders |
| admin | Full platform oversight + pricing config |

To make a user an admin, run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```
