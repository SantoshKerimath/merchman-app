## Task 1: DB Migrations + Type Regen

**Files:**
- Create migration via Supabase MCP
- Modify: `types/database.ts` (regenerate)

**Interfaces:**
- Produces: `Database['public']['Tables']['brand_credentials']['Row']`, `sync_logs` Row, `business_metrics` Row

- [ ] **Step 1: Run migration for `brand_credentials`**

Via Supabase MCP `apply_migration`, name `day8_brand_credentials`:
```sql
CREATE TABLE brand_credentials (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  seller_id               text NOT NULL,
  marketplace_id          text NOT NULL DEFAULT 'A21TJRUUN4KGV',
  lwa_client_id           text NOT NULL,
  lwa_client_secret       text NOT NULL,
  lwa_refresh_token       text NOT NULL,
  access_token_cache      text,
  access_token_expires_at timestamptz,
  sync_schedule           jsonb NOT NULL DEFAULT '{"type":"manual","days":[],"time":"09:00","on_login":false}',
  connected_at            timestamptz DEFAULT now(),
  last_sync_at            timestamptz,
  created_at              timestamptz DEFAULT now(),
  UNIQUE(brand_id)
);

ALTER TABLE brand_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brand credentials"
  ON brand_credentials FOR ALL
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE agency_id = my_agency_id()
    )
  );
```

- [ ] **Step 2: Run migration for `sync_logs`**

Via Supabase MCP, name `day8_sync_logs`:
```sql
CREATE TABLE sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  trigger         text NOT NULL CHECK (trigger IN ('manual','scheduled','on_login')),
  report_type     text NOT NULL CHECK (report_type IN ('settlement','advertising','business','all')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  rows_inserted   integer,
  api_calls_used  integer DEFAULT 0,
  error_message   text,
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own brand sync logs"
  ON sync_logs FOR ALL
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE agency_id = my_agency_id()
    )
  );
```

- [ ] **Step 3: Run migration for `business_metrics`**

Via Supabase MCP, name `day8_business_metrics`:
```sql
CREATE TABLE business_metrics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date                date NOT NULL,
  ordered_sales       numeric,
  units_ordered       integer,
  sessions            integer,
  conversion_rate     numeric,
  avg_selling_price   numeric,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(brand_id, date)
);

ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own business metrics"
  ON business_metrics FOR ALL
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE agency_id = my_agency_id()
    )
  );
```

- [ ] **Step 4: Regenerate TypeScript types**

Via Supabase MCP `generate_typescript_types`, overwrite `types/database.ts`. Confirm all three new tables appear with correct column types.

- [ ] **Step 5: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd app && git add types/database.ts && git commit -m "feat(db): brand_credentials, sync_logs, business_metrics tables + RLS"
```

---

