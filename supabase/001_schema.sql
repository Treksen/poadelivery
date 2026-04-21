-- ================================================================
-- POA DELIVERY — Complete Database Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer'
              CHECK (role IN ('customer','rider','vendor','admin')),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── VENDORS ───────────────────────────────────────────────────
CREATE TABLE vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID REFERENCES profiles(id),
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'restaurant'
                CHECK (category IN ('restaurant','cafe','bakery','grocery','pharmacy','other')),
  logo_url      TEXT,
  cover_url     TEXT,
  address       TEXT NOT NULL,
  lat           DECIMAL(10,7),
  lng           DECIMAL(10,7),
  phone         TEXT,
  email         TEXT,
  is_open       BOOLEAN DEFAULT TRUE,
  is_active     BOOLEAN DEFAULT TRUE,
  rating        DECIMAL(3,2) DEFAULT 0,
  total_orders  INTEGER DEFAULT 0,
  delivery_time INTEGER DEFAULT 30,  -- minutes
  min_order     DECIMAL(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── MENU CATEGORIES ───────────────────────────────────────────
CREATE TABLE menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- ── MENU ITEMS ────────────────────────────────────────────────
CREATE TABLE menu_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    UUID REFERENCES vendors(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES menu_categories(id),
  name         TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  image_url    TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_popular   BOOLEAN DEFAULT FALSE,
  prep_time    INTEGER DEFAULT 15,  -- minutes
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRICING CONFIG ────────────────────────────────────────────
CREATE TABLE pricing_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL DEFAULT 'Standard',
  is_active        BOOLEAN DEFAULT TRUE,
  base_fare        DECIMAL(10,2) NOT NULL DEFAULT 50,
  per_km_rate      DECIMAL(10,2) NOT NULL DEFAULT 30,
  min_fare         DECIMAL(10,2) NOT NULL DEFAULT 80,
  service_fee      DECIMAL(10,2) NOT NULL DEFAULT 20,
  surge_enabled    BOOLEAN DEFAULT TRUE,
  surge_multiplier DECIMAL(4,2) DEFAULT 1.5,
  surge_start_hour INTEGER DEFAULT 17,
  surge_end_hour   INTEGER DEFAULT 20,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pricing_config (name, base_fare, per_km_rate, min_fare, service_fee, surge_enabled, surge_multiplier, surge_start_hour, surge_end_hour)
VALUES ('Poa Standard', 50, 30, 80, 20, TRUE, 1.5, 17, 20);

-- ── ORDERS ────────────────────────────────────────────────────
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       TEXT UNIQUE NOT NULL,
  customer_id        UUID REFERENCES profiles(id),
  vendor_id          UUID REFERENCES vendors(id),
  rider_id           UUID REFERENCES profiles(id),
  status             TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','preparing','ready','assigned','picked_up','in_transit','delivered','cancelled')),
  -- Addresses
  pickup_address     TEXT NOT NULL,
  pickup_lat         DECIMAL(10,7),
  pickup_lng         DECIMAL(10,7),
  dropoff_address    TEXT NOT NULL,
  dropoff_lat        DECIMAL(10,7),
  dropoff_lng        DECIMAL(10,7),
  delivery_notes     TEXT,
  -- Pricing
  subtotal           DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee       DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  surge_multiplier   DECIMAL(4,2) DEFAULT 1.0,
  total_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  distance_km        DECIMAL(8,3),
  is_surge           BOOLEAN DEFAULT FALSE,
  -- Payment
  payment_method     TEXT DEFAULT 'mpesa'
                     CHECK (payment_method IN ('mpesa','cash','card')),
  payment_status     TEXT DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','paid','refunded','failed')),
  -- Tracking
  rider_polyline     JSONB DEFAULT '[]'::jsonb,
  last_known_lat     DECIMAL(10,7),
  last_known_lng     DECIMAL(10,7),
  last_ping_at       TIMESTAMPTZ,
  -- Ratings
  customer_rating    INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
  rider_rating       INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
  review_text        TEXT,
  -- Timestamps
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at       TIMESTAMPTZ,
  preparing_at       TIMESTAMPTZ,
  ready_at           TIMESTAMPTZ,
  assigned_at        TIMESTAMPTZ,
  picked_up_at       TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name         TEXT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  subtotal     DECIMAL(10,2) NOT NULL
);

-- ── RIDER PINGS ───────────────────────────────────────────────
CREATE TABLE rider_pings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  rider_id   UUID REFERENCES profiles(id),
  lat        DECIMAL(10,7) NOT NULL,
  lng        DECIMAL(10,7) NOT NULL,
  speed      DECIMAL(8,2),
  heading    DECIMAL(5,2),
  pinged_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RIDER PROFILES ────────────────────────────────────────────
CREATE TABLE rider_profiles (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type    TEXT DEFAULT 'motorcycle'
                  CHECK (vehicle_type IN ('motorcycle','bicycle','car','walking')),
  vehicle_plate   TEXT,
  id_number       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_online       BOOLEAN DEFAULT FALSE,
  current_lat     DECIMAL(10,7),
  current_lng     DECIMAL(10,7),
  last_seen_at    TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0,
  rating          DECIMAL(3,2) DEFAULT 0,
  total_earned    DECIMAL(12,2) DEFAULT 0
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'info'
             CHECK (type IN ('info','success','warning','error','order')),
  is_read    BOOLEAN DEFAULT FALSE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_orders_customer   ON orders(customer_id, status);
CREATE INDEX idx_orders_vendor     ON orders(vendor_id, status);
CREATE INDEX idx_orders_rider      ON orders(rider_id, status);
CREATE INDEX idx_orders_status     ON orders(status, created_at DESC);
CREATE INDEX idx_rider_pings_order ON rider_pings(order_id, pinged_at DESC);
CREATE INDEX idx_menu_items_vendor ON menu_items(vendor_id, is_available);
CREATE INDEX idx_notif_user        ON notifications(user_id, is_read, created_at DESC);

-- ── PRICING RPC ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_delivery_price(
  p_pickup_lat  DECIMAL, p_pickup_lng  DECIMAL,
  p_dropoff_lat DECIMAL, p_dropoff_lng DECIMAL,
  p_road_km     DECIMAL DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_config      RECORD;
  v_distance_km DECIMAL;
  v_base_fare   DECIMAL;
  v_dist_fare   DECIMAL;
  v_service_fee DECIMAL;
  v_surge_mult  DECIMAL := 1.0;
  v_total       DECIMAL;
  v_is_surge    BOOLEAN := FALSE;
  v_hour        INTEGER;
BEGIN
  SELECT * INTO v_config FROM pricing_config WHERE is_active = TRUE LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'No pricing config'); END IF;

  IF p_road_km IS NOT NULL AND p_road_km > 0 THEN
    v_distance_km := p_road_km;
  ELSE
    v_distance_km := 6371 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS(p_dropoff_lat - p_pickup_lat) / 2), 2) +
      COS(RADIANS(p_pickup_lat)) * COS(RADIANS(p_dropoff_lat)) *
      POWER(SIN(RADIANS(p_dropoff_lng - p_pickup_lng) / 2), 2)
    ));
  END IF;

  v_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Africa/Nairobi');
  IF v_config.surge_enabled AND v_hour >= v_config.surge_start_hour AND v_hour < v_config.surge_end_hour THEN
    v_surge_mult := v_config.surge_multiplier;
    v_is_surge   := TRUE;
  END IF;

  v_base_fare   := v_config.base_fare;
  v_dist_fare   := ROUND((v_distance_km * v_config.per_km_rate)::NUMERIC, 2);
  v_service_fee := v_config.service_fee;
  v_total       := GREATEST(
    ROUND(((v_base_fare + v_dist_fare) * v_surge_mult + v_service_fee)::NUMERIC, 2),
    v_config.min_fare
  );

  RETURN jsonb_build_object(
    'total_fare', v_total, 'base_fare', v_base_fare,
    'distance_fare', ROUND((v_dist_fare * v_surge_mult)::NUMERIC, 2),
    'service_fee', v_service_fee, 'distance_km', ROUND(v_distance_km::NUMERIC, 2),
    'surge_multiplier', v_surge_mult, 'is_surge', v_is_surge, 'config_id', v_config.id
  );
END; $$;
GRANT EXECUTE ON FUNCTION calculate_delivery_price(DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL) TO authenticated, anon;

-- ── RIDER PING RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_rider_ping(
  p_order_id UUID, p_lat DECIMAL, p_lng DECIMAL,
  p_speed DECIMAL DEFAULT NULL, p_heading DECIMAL DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO rider_pings (order_id, rider_id, lat, lng, speed, heading)
  VALUES (p_order_id, auth.uid(), p_lat, p_lng, p_speed, p_heading);

  UPDATE orders SET
    rider_polyline = rider_polyline || jsonb_build_object(
      'lat', p_lat, 'lng', p_lng,
      'timestamp', NOW(), 'speed', p_speed
    ),
    last_known_lat = p_lat, last_known_lng = p_lng,
    last_ping_at = NOW(), updated_at = NOW()
  WHERE id = p_order_id;

  UPDATE rider_profiles SET
    current_lat = p_lat, current_lng = p_lng, last_seen_at = NOW()
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION record_rider_ping(UUID,DECIMAL,DECIMAL,DECIMAL,DECIMAL) TO authenticated;

-- ── ORDER NUMBER SEQUENCE ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq START 1000;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'POA-' || LPAD(nextval('order_seq')::TEXT, 6, '0');
END; $$;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_pings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config  ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users view own profile"   ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin')));
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Vendors — public read, owner write
CREATE POLICY "Anyone views vendors"    ON vendors FOR SELECT USING (TRUE);
CREATE POLICY "Owner manages vendor"    ON vendors FOR ALL TO authenticated USING (owner_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Menu — public read
CREATE POLICY "Anyone views categories" ON menu_categories FOR SELECT USING (TRUE);
CREATE POLICY "Owner manages categories" ON menu_categories FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()) OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Anyone views menu"       ON menu_items FOR SELECT USING (TRUE);
CREATE POLICY "Owner manages menu"      ON menu_items FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()) OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Orders
CREATE POLICY "Parties view order"   ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR rider_id = auth.uid() OR EXISTS(SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()) OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Customer creates order" ON orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Parties update order"   ON orders FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR rider_id = auth.uid() OR EXISTS(SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()) OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Order items
CREATE POLICY "Parties view items"  ON order_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid())));
CREATE POLICY "Customer inserts items" ON order_items FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

-- Rider pings
CREATE POLICY "Rider inserts pings"  ON rider_pings FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid());
CREATE POLICY "Parties view pings"   ON rider_pings FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid())));

-- Rider profiles
CREATE POLICY "Anyone views rider profiles" ON rider_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Rider manages own profile"   ON rider_profiles FOR ALL TO authenticated USING (id = auth.uid());

-- Notifications
CREATE POLICY "Users view own notifs"   ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifs" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System inserts notifs"   ON notifications FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Pricing
CREATE POLICY "Anyone views pricing" ON pricing_config FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages pricing" ON pricing_config FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ── REALTIME ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE rider_pings;

-- ── SEED VENDORS ──────────────────────────────────────────────
INSERT INTO vendors (name, description, category, address, lat, lng, rating, delivery_time, min_order, is_open)
VALUES
  ('Mama Oliech', 'Authentic Kenyan cuisine — nyama choma, ugali, sukuma wiki', 'restaurant', 'Hurlingham, Nairobi', -1.2921, 36.7833, 4.8, 25, 200, TRUE),
  ('Java House', 'Coffee, breakfast, and light meals', 'cafe', 'Westlands, Nairobi', -1.2631, 36.8037, 4.6, 20, 300, TRUE),
  ('Pizza Inn', 'Hot pizzas delivered fast', 'restaurant', 'CBD, Nairobi', -1.2864, 36.8172, 4.3, 35, 400, TRUE),
  ('Artcaffe', 'Premium coffee and European-inspired food', 'cafe', 'Karen, Nairobi', -1.3192, 36.7073, 4.7, 30, 500, TRUE),
  ('Naivas Supermarket', 'Fresh groceries and household items', 'grocery', 'Lavington, Nairobi', -1.2741, 36.7773, 4.5, 45, 0, TRUE);
