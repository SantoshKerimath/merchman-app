# Ad Analytics Page — Design Spec

**Date:** 2026-06-30  
**Replaces:** `/brands/[id]/keywords` — Keywords page

---

## Goal

Replace the current 3-tab keyword list with a full Ad Analytics dashboard: campaign-level and targeting-level views, all metrics, intelligent charts, interactive filter/sort, CSV/XLSX export.

---

## Data Model (existing, no migration needed)

Table: `ppc_targeting`  
Columns: `brand_id`, `start_date`, `end_date`, `campaign_name`, `ad_group`, `targeting`, `match_type`, `impressions`, `clicks`, `ctr`, `cpc`, `spend`, `sales`, `acos`, `roas`, `orders`, `units`, `cvr`

**Placement classification** (derived client-side from `targeting` value):
- Starts with `asin:` → Product targeting
- Starts with `category:` → Category targeting  
- Match type = `Auto` → Auto campaign
- Otherwise → Keyword

**ACOS/ROAS fallback** (calculated client-side when DB value is NULL):
- `acos = spend / sales` (as ratio, display as %)
- `roas = sales / spend`

---

## API Changes

### Existing POST `/api/brands/[id]/targeting`
No change — parser already captures all fields.

### New GET `/api/brands/[id]/targeting?view=campaigns|targeting&from=YYYY-MM-DD&to=YYYY-MM-DD`

**`view=campaigns`** (default): Aggregate by `campaign_name`  
Returns array of:
```ts
{
  campaign_name: string
  impressions: number
  clicks: number
  ctr: number          // clicks / impressions
  cpc: number          // spend / clicks
  spend: number
  sales: number
  acos: number | null  // spend / sales (null if sales = 0)
  roas: number | null  // sales / spend (null if spend = 0)
  orders: number
  units: number
  cvr: number          // orders / clicks
}
```
Computed server-side via Supabase RPC or aggregation query (GROUP BY campaign_name).

**`view=targeting`**: All rows (no aggregation), full columns including `targeting`, `match_type`, `ad_group`.  
Returns array of `ParsedTargeting` shape (all DB columns).

Both endpoints filter by `brand_id`, optional `from`/`to` date range on `start_date`.

---

## Page Structure

**URL:** `/brands/[id]/keywords` (unchanged — no redirect needed)  
**Sidebar label + page title:** "Ad Analytics"

### Layout (top → bottom)

1. `PageHeader` — title "Ad Analytics", breadcrumb, Upload button action
2. Upload bar (existing, keep as-is)
3. Date filter bar (reuse `DateFilterBar` component)
4. Tab switcher: **Campaigns** | **Targeting**
5. Charts section (tab-aware, 3 cards)
6. Full data table (tab-aware)

---

## Charts Section

Charts re-render when tab switches. All use `useChartColors()`.

### Campaigns tab charts

**Card 1 — KPI strip (4 stat boxes, not a chart):**
- Total Impressions | Avg CTR (%) | Total Orders | Total Ad Sales (₹)

**Card 2 — Spend vs Sales, top 8 campaigns (horizontal bar):**
- Two bars per campaign: Spend (negative/red) + Sales (positive/teal)
- Sorted by spend descending

**Card 3 — ACOS vs Spend bubble:**
- X = spend, Y = ACOS %, bubble size = orders
- Color: ACOS > 40% → negative, > 25% → amber, else → positive
- Tooltip: campaign name, spend, ACOS, orders

### Targeting tab charts

**Card 1 — same KPI strip** (aggregated from targeting rows)

**Card 2 — Placement type breakdown (donut):**
- Segments: Keyword | Product (ASIN) | Category | Auto
- Shows spend per placement type
- Legend with % share

**Card 3 — Match type distribution (donut):**
- Segments: Exact | Phrase | Broad | Auto | Other
- Shows spend per match type

---

## Table

### Campaigns table columns

| # | Column | Format | Sortable |
|---|--------|--------|---------|
| 1 | Campaign Name | text | ✓ |
| 2 | Impressions | number | ✓ |
| 3 | Clicks | number | ✓ |
| 4 | CTR | % (2dp) | ✓ |
| 5 | CPC | ₹ | ✓ |
| 6 | Spend | ₹ | ✓ |
| 7 | Sales | ₹ | ✓ |
| 8 | ACOS | % with color | ✓ |
| 9 | RoAS | Nx (1dp) | ✓ |
| 10 | Orders | number | ✓ |
| 11 | Units | number | ✓ |
| 12 | CVR | % | ✓ |

### Targeting table columns

Same columns as above plus:
- **Ad Group** (after Campaign Name)
- **Target** (keyword or ASIN/category string)
- **Match Type** (`StatusBadge`)
- **Placement** (derived: Keyword/Product/Category/Auto — `StatusBadge`)

### Table interactions

**Sort:** Click any column header → toggle asc/desc. Visual arrow indicator.

**Search:** Text input above table → filters Campaign Name (campaigns tab) or Target string (targeting tab). Case-insensitive substring match. Client-side.

**Column visibility toggle:** "Columns" button → dropdown checkboxes. Persist in `localStorage`.

**Export:**
- "Export CSV" button → `papaparse` → `URL.createObjectURL` download
- "Export Excel" button → `SheetJS (xlsx)` → `.xlsx` download
- Exports current visible + filtered rows, all columns (not just visible ones)

**Pagination:** 50 rows per page, simple prev/next. Client-side slice of filtered+sorted array.

---

## File Structure

```
app/app/(dashboard)/brands/[id]/keywords/
  page.tsx                    — server wrapper (rename title, keep URL)
  AdAnalyticsClient.tsx       — NEW: replaces KeywordsClient.tsx (full page client)

app/components/adanalytics/
  CampaignCharts.tsx          — Campaigns tab: KPI strip + bar + bubble
  TargetingCharts.tsx         — Targeting tab: KPI strip + 2 donuts
  AdTable.tsx                 — Shared table with sort/search/export/pagination

app/api/brands/[id]/targeting/route.ts — Modify GET to support view + date params
```

`KeywordsClient.tsx` is deleted (replaced by `AdAnalyticsClient.tsx`).

---

## Error / Empty States

- No data: `EmptyState` with upload CTA
- Upload error: inline error message (existing pattern)
- Date range with no data: `EmptyState` "No data for this period"

---

## Constraints

- No new npm packages beyond already-installed `papaparse` and `xlsx` (SheetJS)
- No DB schema changes
- TypeScript strict — no `any`
- Reuse `useChartColors()`, `DateFilterBar`, `PageHeader`, `SectionCard`, `StatusBadge`, `EmptyState`, `KpiCard`
- ACOS color thresholds: > 40% → negative, > 25% → amber, ≤ 25% → positive
