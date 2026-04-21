-- ================================================================
-- Migration 006: Full Auth Setup + 3 Kenyan Street Food Vendors
-- Run in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Profile trigger (auto-create on signup) ────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role','customer'),
    NEW.raw_user_meta_data->>'phone'
  ) ON CONFLICT (id) DO NOTHING;

  -- Rider row
  IF (NEW.raw_user_meta_data->>'role') = 'rider' THEN
    INSERT INTO public.rider_profiles (id, vehicle_type, vehicle_plate, is_online)
    VALUES (NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type','motorcycle'),
      NEW.raw_user_meta_data->>'vehicle_plate', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Vendor row
  IF (NEW.raw_user_meta_data->>'role') = 'vendor' THEN
    INSERT INTO public.vendors (owner_id, name, description, category, address,
      lat, lng, phone, email, is_active, is_open, delivery_time, min_order)
    VALUES (NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business_name', split_part(NEW.email,'@',1)),
      NEW.raw_user_meta_data->>'description',
      COALESCE(NEW.raw_user_meta_data->>'category','restaurant'),
      COALESCE(NEW.raw_user_meta_data->>'address','Nairobi, Kenya'),
      COALESCE((NEW.raw_user_meta_data->>'lat')::DECIMAL, -1.2921),
      COALESCE((NEW.raw_user_meta_data->>'lng')::DECIMAL, 36.8219),
      NEW.raw_user_meta_data->>'phone', NEW.email,
      FALSE, FALSE, 30, 200)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. Fix RLS ────────────────────────────────────────────────
-- Profiles
DROP POLICY IF EXISTS "select_own_profile"    ON profiles;
DROP POLICY IF EXISTS "insert_own_profile"    ON profiles;
DROP POLICY IF EXISTS "update_own_profile"    ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Vendors
DROP POLICY IF EXISTS "public_read_vendors"   ON vendors;
DROP POLICY IF EXISTS "owner_manage_vendor"   ON vendors;
DROP POLICY IF EXISTS "vendors_read"          ON vendors;
DROP POLICY IF EXISTS "vendors_insert"        ON vendors;
DROP POLICY IF EXISTS "vendors_update"        ON vendors;
CREATE POLICY "vendors_select" ON vendors FOR SELECT USING (TRUE);
CREATE POLICY "vendors_insert" ON vendors FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vendors_update" ON vendors FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

-- Rider profiles
DROP POLICY IF EXISTS "Anyone views rider profiles" ON rider_profiles;
DROP POLICY IF EXISTS "Rider manages own profile"   ON rider_profiles;
DROP POLICY IF EXISTS "rider_profiles_read"  ON rider_profiles;
DROP POLICY IF EXISTS "rider_profiles_write" ON rider_profiles;
CREATE POLICY "rider_profiles_select" ON rider_profiles FOR SELECT USING (TRUE);
CREATE POLICY "rider_profiles_write"  ON rider_profiles FOR ALL TO authenticated
  USING (id = auth.uid());

-- ── 3. Seed 3 Kenyan Street Food Vendors ─────────────────────
DO $$
DECLARE
  uid1 UUID := gen_random_uuid();
  uid2 UUID := gen_random_uuid();
  uid3 UUID := gen_random_uuid();
  v1   UUID; v2 UUID; v3 UUID;
  c1   UUID; c2 UUID; c3 UUID; c4 UUID;
BEGIN

-- ────────────────────────────────────────────────────────────
-- VENDOR 1: Mama's Kitchen — Kenyan home cooking
-- ────────────────────────────────────────────────────────────
INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_user_meta_data)
VALUES (uid1,'mamas.kitchen@poa.app',crypt('Poa2024!',gen_salt('bf')),NOW(),NOW(),NOW(),
  '{"name":"Mama Wanjiku","role":"vendor"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id,name,email,role,phone)
VALUES (uid1,'Mama Wanjiku','mamas.kitchen@poa.app','vendor','+254711000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (owner_id,name,description,category,address,lat,lng,phone,email,is_active,is_open,rating,delivery_time,min_order)
VALUES (uid1,'Mama''s Kitchen',
  'Authentic Kenyan street food — nyama choma, pilau, mutura, smokie pasua and more. Taste of home, delivered.',
  'restaurant','Westlands, Nairobi',-1.2631,36.8037,'+254711000001','mamas.kitchen@poa.app',TRUE,TRUE,4.8,25,200)
ON CONFLICT DO NOTHING;

SELECT id INTO v1 FROM vendors WHERE email='mamas.kitchen@poa.app' LIMIT 1;

INSERT INTO menu_categories(vendor_id,name,sort_order) VALUES
  (v1,'Grilled & Roasted',1),(v1,'Rice & Stew',2),(v1,'Street Snacks',3),(v1,'Drinks',4)
ON CONFLICT DO NOTHING;

SELECT id INTO c1 FROM menu_categories WHERE vendor_id=v1 AND name='Grilled & Roasted';
SELECT id INTO c2 FROM menu_categories WHERE vendor_id=v1 AND name='Rice & Stew';
SELECT id INTO c3 FROM menu_categories WHERE vendor_id=v1 AND name='Street Snacks';
SELECT id INTO c4 FROM menu_categories WHERE vendor_id=v1 AND name='Drinks';

INSERT INTO menu_items(vendor_id,category_id,name,description,price,is_available,is_popular) VALUES
  (v1,c1,'Nyama Choma (500g)','Charcoal-grilled goat, kachumbari & ugali',850,true,true),
  (v1,c1,'Mutura (Half Roll)','Kenyan blood sausage, roasted over charcoal',250,true,true),
  (v1,c1,'Kuku Choma (Quarter)','Whole free-range chicken, grilled with spices',550,true,true),
  (v1,c1,'Smokies Pasua','Smokie sliced open, filled with kachumbari & chilli',80,true,true),
  (v1,c1,'Mishkaki (5 skewers)','Spiced beef skewers off the jiko',350,true,false),
  (v1,c2,'Pilau ya Mama','Fragrant Swahili spiced rice with beef',380,true,true),
  (v1,c2,'Ugali na Sukuma','Maize meal with braised collard greens & stewed beef',280,true,true),
  (v1,c2,'Mukimo wa Murang''a','Mashed potatoes, peas, maize & greens',300,true,false),
  (v1,c2,'Githeri ya Mama','Maize & beans slow-cooked with tomatoes',220,true,false),
  (v1,c2,'Omena Stew & Ugali','Lake Victoria dagaa in tomato curry',280,true,false),
  (v1,c3,'Maandazi (4 pcs)','Freshly fried Swahili doughnuts',80,true,true),
  (v1,c3,'Mandazi & Chai','Maandazi served with spiced tea',130,true,true),
  (v1,c3,'Viazi Karai','Street-style deep-fried potato chunks with sauce',150,true,true),
  (v1,c3,'Samosa (3 pcs)','Crispy beef or veggie samosas',150,true,false),
  (v1,c4,'Tangawizi Tea (500ml)','Ginger-spiced Kenyan tea with milk',100,true,true),
  (v1,c4,'Dawa (250ml)','Kenyan dawa — lime, honey & vodka (non-alcoholic version)',120,true,false),
  (v1,c4,'Passion Juice (500ml)','Fresh passion fruit juice, lightly sweetened',150,true,false)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- VENDOR 2: Nairobi Bites — CBD street food
-- ────────────────────────────────────────────────────────────
INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_user_meta_data)
VALUES (uid2,'nairobi.bites@poa.app',crypt('Poa2024!',gen_salt('bf')),NOW(),NOW(),NOW(),
  '{"name":"Patrick Otieno","role":"vendor"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id,name,email,role,phone)
VALUES (uid2,'Patrick Otieno','nairobi.bites@poa.app','vendor','+254711000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (owner_id,name,description,category,address,lat,lng,phone,email,is_active,is_open,rating,delivery_time,min_order)
VALUES (uid2,'Nairobi Bites',
  'The best of Nairobi CBD street food — chapati rolls, bhajia, roasted maize and hot snacks since 2010.',
  'restaurant','CBD, Nairobi',-1.2864,36.8172,'+254711000002','nairobi.bites@poa.app',TRUE,TRUE,4.6,30,150)
ON CONFLICT DO NOTHING;

SELECT id INTO v2 FROM vendors WHERE email='nairobi.bites@poa.app' LIMIT 1;

INSERT INTO menu_categories(vendor_id,name,sort_order) VALUES
  (v2,'Chapati & Wraps',1),(v2,'Bhajia & Fries',2),(v2,'Hot Snacks',3),(v2,'Drinks',4)
ON CONFLICT DO NOTHING;

SELECT id INTO c1 FROM menu_categories WHERE vendor_id=v2 AND name='Chapati & Wraps';
SELECT id INTO c2 FROM menu_categories WHERE vendor_id=v2 AND name='Bhajia & Fries';
SELECT id INTO c3 FROM menu_categories WHERE vendor_id=v2 AND name='Hot Snacks';
SELECT id INTO c4 FROM menu_categories WHERE vendor_id=v2 AND name='Drinks';

INSERT INTO menu_items(vendor_id,category_id,name,description,price,is_available,is_popular) VALUES
  (v2,c1,'Chapati Roll (Beef)','Soft chapati rolled with spiced beef, kachumbari & sauce',180,true,true),
  (v2,c1,'Chapati Roll (Egg)','Chapati with fried egg, tomatoes & chilli',150,true,true),
  (v2,c1,'Chapati Roll (Veggie)','Chapati stuffed with avocado, tomato & cucumber',140,true,false),
  (v2,c1,'Mkate Mayai','Swahili egg bread — folded with spiced mince & egg',200,true,true),
  (v2,c1,'Chapati (3 pcs)','Plain soft chapati, freshly made',120,true,false),
  (v2,c2,'Bhajia (10 pcs)','Crispy spiced potato fritters, tamarind sauce',200,true,true),
  (v2,c2,'Chips Masala','Fries tossed in tomato, onion & coriander masala',250,true,true),
  (v2,c2,'Chips & Egg','Classic Nairobi chips and fried eggs',280,true,true),
  (v2,c2,'Bhajia & Chips Combo','Bhajia plus chips, kachumbari, sauce',350,true,false),
  (v2,c3,'Sausage Roll (2 pcs)','Flaky pastry sausage rolls, freshly baked',150,true,true),
  (v2,c3,'Roasted Maize (cob)','Charcoal-roasted maize, salted & lemoned',60,true,true),
  (v2,c3,'Groundnuts (100g)','Roasted salted groundnuts in a paper cone',50,true,false),
  (v2,c3,'Kaimati (6 pcs)','Sweet Swahili doughnut balls in syrup',120,true,true),
  (v2,c4,'Maji ya Embe (350ml)','Fresh mango juice',120,true,false),
  (v2,c4,'Madafu (Coconut)','Fresh young coconut water',100,true,true),
  (v2,c4,'Soda (350ml)','Coke, Fanta or Sprite',80,true,false)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- VENDOR 3: Kahawa & Vitumbua — cafe + Kenyan pastries
-- ────────────────────────────────────────────────────────────
INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_user_meta_data)
VALUES (uid3,'kahawa.cafe@poa.app',crypt('Poa2024!',gen_salt('bf')),NOW(),NOW(),NOW(),
  '{"name":"Amina Hassan","role":"vendor"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id,name,email,role,phone)
VALUES (uid3,'Amina Hassan','kahawa.cafe@poa.app','vendor','+254711000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (owner_id,name,description,category,address,lat,lng,phone,email,is_active,is_open,rating,delivery_time,min_order)
VALUES (uid3,'Kahawa & Vitumbua',
  'Kenyan coffee, vitumbua, mandazi, mahamri and authentic coastal bites. Your morning and afternoon, sorted.',
  'cafe','Karen, Nairobi',-1.3192,36.7073,'+254711000003','kahawa.cafe@poa.app',TRUE,TRUE,4.7,20,150)
ON CONFLICT DO NOTHING;

SELECT id INTO v3 FROM vendors WHERE email='kahawa.cafe@poa.app' LIMIT 1;

INSERT INTO menu_categories(vendor_id,name,sort_order) VALUES
  (v3,'Kenyan Coffee',1),(v3,'Kenyan Pastries',2),(v3,'Coastal Bites',3),(v3,'Cold & Juices',4)
ON CONFLICT DO NOTHING;

SELECT id INTO c1 FROM menu_categories WHERE vendor_id=v3 AND name='Kenyan Coffee';
SELECT id INTO c2 FROM menu_categories WHERE vendor_id=v3 AND name='Kenyan Pastries';
SELECT id INTO c3 FROM menu_categories WHERE vendor_id=v3 AND name='Coastal Bites';
SELECT id INTO c4 FROM menu_categories WHERE vendor_id=v3 AND name='Cold & Juices';

INSERT INTO menu_items(vendor_id,category_id,name,description,price,is_available,is_popular) VALUES
  (v3,c1,'Kahawa Chungu','Traditional bitter Kenyan coffee, cardamom & ginger',100,true,true),
  (v3,c1,'Kenyan AA Filter','Single-origin Kenyan AA beans, French press',280,true,true),
  (v3,c1,'Chai Tangawizi (500ml)','Ginger-spiced tea with milk & cinnamon',100,true,true),
  (v3,c1,'Spiced Milk Tea (500ml)','Cardamom, cloves & cinnamon milk tea',120,true,false),
  (v3,c1,'Kindu ya Kahawa','Kenyan coffee with honey & lemon',150,true,false),
  (v3,c2,'Vitumbua (6 pcs)','Coconut rice pancakes, crispy edges, soft centre',150,true,true),
  (v3,c2,'Mahamri (4 pcs)','Swahili coconut doughnuts, perfect with chai',120,true,true),
  (v3,c2,'Mandazi (4 pcs)','Lightly sweet fried dough, cardamom flavour',80,true,true),
  (v3,c2,'Mkate wa Ufuta','Sesame seed bread, Swahili style',100,true,false),
  (v3,c2,'Chai & Mandazi Set','Chai tangawizi + 4 mandazi',180,true,true),
  (v3,c3,'Kachori (3 pcs)','Spiced lentil-filled pastry puffs',150,true,true),
  (v3,c3,'Urojo (Mombasa Mix)','Tangy Mombasa soup with bhajia, potatoes & samosa',250,true,true),
  (v3,c3,'Mkate wa Sinia','Swahili coconut bread with butter',120,true,false),
  (v3,c3,'Pilipili ya Korosho','Roasted cashews with chilli & lime (100g)',200,true,false),
  (v3,c4,'Tamarind Juice (350ml)','Kenyan tamarind cooler, lightly spiced',130,true,true),
  (v3,c4,'Madafu (Coconut water)','Fresh young coconut, direct from the shell',100,true,true),
  (v3,c4,'Hibiscus Cooler (350ml)','Chilled hibiscus & ginger drink',120,true,false)
ON CONFLICT DO NOTHING;

END $$;

-- ── 4. Backfill existing auth users without profiles ──────────
INSERT INTO profiles (id, name, email, role)
SELECT u.id, split_part(u.email,'@',1), u.email, 'customer'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────
SELECT v.name, v.email, v.is_active, COUNT(i.id) AS menu_items
FROM vendors v
LEFT JOIN menu_items i ON i.vendor_id = v.id
WHERE v.email IN ('mamas.kitchen@poa.app','nairobi.bites@poa.app','kahawa.cafe@poa.app')
GROUP BY v.name, v.email, v.is_active
ORDER BY v.name;
