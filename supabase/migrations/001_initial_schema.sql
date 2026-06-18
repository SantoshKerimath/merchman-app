-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- AGENCIES
-- ============================================================
CREATE TABLE agencies (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  plan       text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  settings   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE team_members (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id  uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE brands (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id             uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  amazon_seller_id      text,
  marketplace_id        text NOT NULL DEFAULT 'A21TJRUUN4KGV',
  sp_api_refresh_token  text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id     uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  asin         text,
  sku          text NOT NULL,
  fnsku        text,
  name         text NOT NULL,
  short_name   text,
  category     text,
  cogs         numeric(10,2),
  price        numeric(10,2),
  fba_fee      numeric(10,2),
  referral_fee numeric(10,2),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, sku)
);

-- ============================================================
-- SETTLEMENTS
-- ============================================================
CREATE TABLE settlements (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id         uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  settlement_id    bigint,
  transaction_date timestamptz NOT NULL,
  order_id         text,
  sku              text,
  type             text,
  quantity         integer,
  product_sales    numeric(12,2),
  shipping_credits numeric(12,2),
  promo_rebates    numeric(12,2),
  tcs_cgst         numeric(12,2),
  tcs_sgst         numeric(12,2),
  tcs_igst         numeric(12,2),
  tds              numeric(12,2),
  fba_fees         numeric(12,2),
  selling_fees     numeric(12,2),
  other_fees       numeric(12,2),
  total            numeric(12,2),
  city             text,
  state            text,
  fulfillment      text,
  imported_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settlements_brand_date_idx ON settlements(brand_id, transaction_date);
CREATE INDEX settlements_sku_idx ON settlements(brand_id, sku);

-- ============================================================
-- PPC DATA
-- ============================================================
CREATE TABLE ppc_data (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  start_date    date NOT NULL,
  end_date      date,
  campaign_name text,
  ad_group      text,
  sku           text,
  asin          text,
  impressions   integer,
  clicks        integer,
  ctr           numeric(8,4),
  cpc           numeric(10,2),
  spend         numeric(12,2),
  sales         numeric(12,2),
  acos          numeric(8,4),
  roas          numeric(8,4),
  orders        integer,
  units         integer,
  cvr           numeric(8,4),
  imported_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ppc_data_brand_date_idx ON ppc_data(brand_id, start_date);

-- ============================================================
-- DAILY METRICS (pre-computed rollups)
-- ============================================================
CREATE TABLE daily_metrics (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id     uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date         date NOT NULL,
  total_sales  numeric(12,2),
  units_sold   integer,
  income       numeric(12,2),
  gross_profit numeric(12,2),
  net_profit   numeric(12,2),
  net_margin   numeric(8,4),
  ppc_spend    numeric(12,2),
  ppc_sales    numeric(12,2),
  acos         numeric(8,4),
  tacos        numeric(8,4),
  returns      integer,
  refund_value numeric(12,2),
  UNIQUE(brand_id, date)
);

CREATE INDEX daily_metrics_brand_date_idx ON daily_metrics(brand_id, date);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id     uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('stock_low','acos_high','rank_drop','sales_drop','roas_drop','no_data')),
  severity     text NOT NULL CHECK (severity IN ('info','warning','critical')),
  message      text NOT NULL,
  metric_value numeric,
  threshold    numeric,
  resolved_at  timestamptz,
  notified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alerts_brand_unresolved_idx ON alerts(brand_id) WHERE resolved_at IS NULL;

-- ============================================================
-- KNOWLEDGE ENTRIES
-- ============================================================
CREATE TABLE knowledge_entries (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id       uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  brand_id        uuid REFERENCES brands(id) ON DELETE SET NULL,
  content         text NOT NULL,
  reasoning       text,
  action_type     text NOT NULL CHECK (action_type IN ('bid_change','pause','promo','other')),
  context_metrics jsonb,
  embedding       vector(1536),
  created_by      uuid NOT NULL REFERENCES team_members(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_entries_embedding_idx ON knowledge_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE agencies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_data        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Helper function: get agency_id for current user
CREATE OR REPLACE FUNCTION my_agency_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT agency_id FROM team_members WHERE id = auth.uid()
$$;

-- Policies
CREATE POLICY "own_agency" ON agencies
  FOR ALL USING (id = my_agency_id());

CREATE POLICY "own_agency_members" ON team_members
  FOR ALL USING (agency_id = my_agency_id());

CREATE POLICY "own_agency_brands" ON brands
  FOR ALL USING (agency_id = my_agency_id());

CREATE POLICY "own_brand_products" ON products
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE agency_id = my_agency_id()));

CREATE POLICY "own_brand_settlements" ON settlements
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE agency_id = my_agency_id()));

CREATE POLICY "own_brand_ppc" ON ppc_data
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE agency_id = my_agency_id()));

CREATE POLICY "own_brand_metrics" ON daily_metrics
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE agency_id = my_agency_id()));

CREATE POLICY "own_brand_alerts" ON alerts
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE agency_id = my_agency_id()));

CREATE POLICY "own_agency_knowledge" ON knowledge_entries
  FOR ALL USING (agency_id = my_agency_id());
