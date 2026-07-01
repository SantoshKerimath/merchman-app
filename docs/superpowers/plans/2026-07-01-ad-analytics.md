# Ad Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Keywords page with a full Ad Analytics dashboard: campaign + targeting views, all PPC metrics, tab-aware intelligent charts, interactive sortable/filterable table with CSV/XLSX export.

**Architecture:** Pure aggregation helpers in `lib/adanalytics.ts` (tested); updated `GET /api/brands/[id]/targeting` supports `?view=campaigns|targeting&from&to`; focused chart components and shared table under `components/adanalytics/`; new `AdAnalyticsClient.tsx` orchestrator replaces `KeywordsClient.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Recharts (installed), SheetJS/xlsx (installed), Tailwind v4 design tokens.

## Global Constraints

- No new npm packages — `xlsx` (SheetJS) and `recharts` already installed
- TypeScript strict — no `any`
- Design tokens only: `bg-surface-*`, `text-text-*`, `border-border-*`, `bg-accent-primary`, `text-data-*`
- `useChartColors()` from `@/lib/hooks/use-chart-colors` for all chart colors
- ACOS thresholds: `> 0.4` → negative, `> 0.25` → amber, `≤ 0.25` → positive (ACOS stored as ratio 0–1)
- `formatINR` from `@/lib/pl-engine/compute`
- All rate metrics (ACOS, CTR, CVR) normalized to ratio (0–1) at API boundary; display multiplies by 100
- Column visibility key: `mm_adtable_cols` in `localStorage`
- Pagination: 50 rows per page (client-side slice)
- CSV: manual string construction — no package
- URL stays `/brands/[id]/keywords` — no redirect

## File Structure

**Create:**
- `lib/adanalytics.ts` — pure functions: `classifyPlacement`, `aggregateByCampaign`, types
- `lib/__tests__/adanalytics.test.ts` — unit tests
- `components/adanalytics/CampaignCharts.tsx` — KPI strip + spend/sales bar + ACOS bubble
- `components/adanalytics/TargetingCharts.tsx` — KPI strip + placement donut + match type donut
- `components/adanalytics/AdTable.tsx` — shared sortable/filterable/exportable table
- `app/(dashboard)/brands/[id]/keywords/AdAnalyticsClient.tsx` — main orchestrator

**Modify:**
- `app/api/brands/[id]/targeting/route.ts` — GET: support view + date params
- `app/(dashboard)/brands/[id]/keywords/page.tsx` — title "Ad Analytics"
- `app/(dashboard)/brands/[id]/page.tsx` — "Keywords" link label → "Ad Analytics"

**Delete:**
- `app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx`

---

### Task 1: Aggregation Logic + Types (`lib/adanalytics.ts`)

**Files:**
- Create: `lib/adanalytics.ts`
- Create: `lib/__tests__/adanalytics.test.ts`

**Interfaces:**
- Produces: `PlacementType`, `RawRow`, `CampaignRow`, `TargetingViewRow`, `classifyPlacement()`, `aggregateByCampaign()`

- [ ] **Step 1: Write failing tests**

```bash
# Create test file
cat > lib/__tests__/adanalytics.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'
import { classifyPlacement, aggregateByCampaign } from '../adanalytics'

describe('classifyPlacement', () => {
  it('classifies asin: prefix as Product', () => {
    expect(classifyPlacement('asin:B001234567', null)).toBe('Product')
  })
  it('classifies category: prefix as Category', () => {
    expect(classifyPlacement('category:12345', null)).toBe('Category')
  })
  it('classifies Auto match type as Auto', () => {
    expect(classifyPlacement('women shoes', 'Auto')).toBe('Auto')
  })
  it('defaults to Keyword', () => {
    expect(classifyPlacement('women shoes', 'Exact')).toBe('Keyword')
  })
  it('handles null targeting as Keyword', () => {
    expect(classifyPlacement(null, 'Exact')).toBe('Keyword')
  })
})

describe('aggregateByCampaign', () => {
  const makeRow = (campaign: string, overrides: Partial<{impressions:number,clicks:number,spend:number,sales:number,orders:number,units:number}> = {}) => ({
    campaign_name: campaign, ad_group: null, targeting: null, match_type: null,
    ctr: null, cpc: null, acos: null, roas: null, cvr: null,
    impressions: 1000, clicks: 50, spend: 500, sales: 2000, orders: 10, units: 12,
    ...overrides,
  })

  it('sums metrics by campaign', () => {
    const rows = [makeRow('Camp A', { spend: 500, sales: 2000 }), makeRow('Camp A', { spend: 250, sales: 1000 })]
    const result = aggregateByCampaign(rows)
    expect(result).toHaveLength(1)
    expect(result[0].spend).toBe(750)
    expect(result[0].sales).toBe(3000)
  })

  it('derives ACOS as ratio', () => {
    const rows = [makeRow('B', { spend: 200, sales: 1000, clicks: 100, impressions: 1000, orders: 20 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].acos).toBeCloseTo(0.2)
    expect(result[0].roas).toBe(5)
    expect(result[0].ctr).toBeCloseTo(0.1)
    expect(result[0].cvr).toBeCloseTo(0.2)
    expect(result[0].cpc).toBe(2)
  })

  it('returns null acos/roas when sales/spend is 0', () => {
    const rows = [makeRow('C', { spend: 100, sales: 0, orders: 0 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].acos).toBeNull()
    expect(result[0].roas).toBeNull()
  })

  it('sorts by spend descending', () => {
    const rows = [makeRow('A', { spend: 100 }), makeRow('B', { spend: 300 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].campaign_name).toBe('B')
    expect(result[1].campaign_name).toBe('A')
  })
})
EOF
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /path/to/repo/app && npx vitest run lib/__tests__/adanalytics.test.ts
```
Expected: `Cannot find module '../adanalytics'`

- [ ] **Step 3: Create `lib/adanalytics.ts`**

```ts
// lib/adanalytics.ts

export type PlacementType = 'Keyword' | 'Product' | 'Category' | 'Auto'

export interface RawRow {
  campaign_name: string | null
  ad_group: string | null
  targeting: string | null
  match_type: string | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  spend: number | null
  sales: number | null
  acos: number | null
  roas: number | null
  orders: number | null
  units: number | null
  cvr: number | null
}

export interface CampaignRow {
  campaign_name: string
  impressions: number
  clicks: number
  ctr: number      // ratio 0–1 (clicks/impressions)
  cpc: number      // spend/clicks
  spend: number
  sales: number
  acos: number | null  // ratio 0–1 (spend/sales)
  roas: number | null  // sales/spend
  orders: number
  units: number
  cvr: number      // ratio 0–1 (orders/clicks)
}

export interface TargetingViewRow extends Required<RawRow> {
  placement: PlacementType
}

export function classifyPlacement(
  targeting: string | null,
  matchType: string | null
): PlacementType {
  if (!targeting) return 'Keyword'
  if (targeting.startsWith('asin:')) return 'Product'
  if (targeting.startsWith('category:')) return 'Category'
  if (matchType === 'Auto') return 'Auto'
  return 'Keyword'
}

export function aggregateByCampaign(rows: RawRow[]): CampaignRow[] {
  const map = new Map<string, {
    impressions: number; clicks: number; spend: number
    sales: number; orders: number; units: number
  }>()

  for (const r of rows) {
    const key = r.campaign_name ?? '(Unknown)'
    const acc = map.get(key) ?? { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 }
    acc.impressions += r.impressions ?? 0
    acc.clicks     += r.clicks ?? 0
    acc.spend      += r.spend ?? 0
    acc.sales      += r.sales ?? 0
    acc.orders     += r.orders ?? 0
    acc.units      += r.units ?? 0
    map.set(key, acc)
  }

  return Array.from(map.entries())
    .map(([campaign_name, acc]) => ({
      campaign_name,
      ...acc,
      ctr:  acc.impressions > 0 ? acc.clicks / acc.impressions : 0,
      cpc:  acc.clicks > 0 ? acc.spend / acc.clicks : 0,
      acos: acc.sales > 0 ? acc.spend / acc.sales : null,
      roas: acc.spend > 0 ? acc.sales / acc.spend : null,
      cvr:  acc.clicks > 0 ? acc.orders / acc.clicks : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
}

/** Normalise ACOS from Amazon's report to 0–1 ratio.
 *  Amazon may return "35.00%" which the parser strips to 35.
 *  We want 0.35. */
export function normalizeRate(v: number | null): number | null {
  if (v === null) return null
  return v > 1 ? v / 100 : v
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /path/to/repo/app && npx vitest run lib/__tests__/adanalytics.test.ts
```
Expected: all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/adanalytics.ts lib/__tests__/adanalytics.test.ts
git commit -m "feat(adanalytics): aggregation helpers + tests"
```

---

### Task 2: Updated API Route

**Files:**
- Modify: `app/api/brands/[id]/targeting/route.ts`

**Interfaces:**
- Consumes: `aggregateByCampaign`, `classifyPlacement`, `normalizeRate`, `RawRow` from `@/lib/adanalytics`
- Produces:
  - `GET ?view=campaigns` → `CampaignRow[]`
  - `GET ?view=targeting` → `TargetingViewRow[]`

- [ ] **Step 1: Replace GET handler**

Full updated `route.ts` (POST handler stays unchanged — copy it as-is):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseSpTargetingBuffer } from '@/lib/parsers/sp-targeting'
import { aggregateByCampaign, classifyPlacement, normalizeRate } from '@/lib/adanalytics'
import type { RawRow } from '@/lib/adanalytics'

// POST handler — unchanged, keep existing implementation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') ?? 'campaigns'
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('ppc_targeting')
    .select('campaign_name, ad_group, targeting, match_type, impressions, clicks, spend, sales, acos, roas, orders, units, ctr, cpc, cvr')
    .eq('brand_id', brandId)
    .gt('spend', 0)

  if (from) query = query.gte('start_date', from)
  if (to)   query = query.lte('start_date', to)

  const { data, error } = await query.order('spend', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json([])

  // Cast to RawRow (Supabase returns loose types)
  const rows = data as RawRow[]

  if (view === 'campaigns') {
    return NextResponse.json(aggregateByCampaign(rows))
  }

  // targeting view: return raw rows with normalized rates + placement
  const targeting = rows.map((r) => ({
    ...r,
    acos:      normalizeRate(r.acos),
    roas:      r.roas ?? (r.spend && r.sales ? r.sales / r.spend : null),
    ctr:       normalizeRate(r.ctr),
    cvr:       normalizeRate(r.cvr),
    placement: classifyPlacement(r.targeting, r.match_type),
  }))

  return NextResponse.json(targeting)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /path/to/repo/app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
# With dev server running:
curl "http://localhost:3000/api/brands/YOUR_BRAND_ID/targeting?view=campaigns" \
  -H "Cookie: <paste session cookie>" | python3 -m json.tool | head -60
```
Expected: JSON array of campaign objects with `campaign_name`, `spend`, `acos` (ratio), etc.

- [ ] **Step 4: Commit**

```bash
git add app/api/brands/[id]/targeting/route.ts
git commit -m "feat(adanalytics): GET route supports view + date params"
```

---

### Task 3: `components/adanalytics/CampaignCharts.tsx`

**Files:**
- Create: `components/adanalytics/CampaignCharts.tsx`

**Interfaces:**
- Consumes: `CampaignRow` from `@/lib/adanalytics`
- Produces: `export default function CampaignCharts({ campaigns }: { campaigns: CampaignRow[] })`

- [ ] **Step 1: Create the component**

```tsx
// components/adanalytics/CampaignCharts.tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts'
import { useChartColors } from '@/lib/hooks/use-chart-colors'
import { formatINR } from '@/lib/pl-engine/compute'
import type { CampaignRow } from '@/lib/adanalytics'

interface Props { campaigns: CampaignRow[] }

// ── KPI strip ───────────────────────────────────────────────────────────────

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-lg font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

function KpiStrip({ campaigns }: Props) {
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0)
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
  const totalOrders      = campaigns.reduce((s, c) => s + c.orders, 0)
  const totalSales       = campaigns.reduce((s, c) => s + c.sales, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiBox label="Impressions"  value={totalImpressions.toLocaleString('en-IN')} />
      <KpiBox label="Avg CTR"      value={`${avgCtr.toFixed(2)}%`} />
      <KpiBox label="Total Orders" value={totalOrders.toLocaleString('en-IN')} />
      <KpiBox label="Ad Sales"     value={formatINR(totalSales)} />
    </div>
  )
}

// ── Spend vs Sales bar ───────────────────────────────────────────────────────

function SpendSalesBar({ campaigns }: Props) {
  const colors = useChartColors()
  const top8 = campaigns.slice(0, 8)
  const data = top8.map(c => ({
    name: c.campaign_name.length > 20 ? c.campaign_name.slice(0, 20) + '…' : c.campaign_name,
    Spend: c.spend,
    Sales: c.sales,
  }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">Spend vs Sales — Top Campaigns</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: colors.muted }}
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: colors.muted }} width={130} />
          <Tooltip
            formatter={(v: unknown) => formatINR(v as number)}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Spend" fill={colors.negative} radius={[0, 3, 3, 0]} />
          <Bar dataKey="Sales" fill={colors.teal}     radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── ACOS vs Spend bubble ─────────────────────────────────────────────────────

function AcosBubble({ campaigns }: Props) {
  const colors = useChartColors()

  const data = campaigns
    .filter(c => c.acos !== null && c.spend > 0)
    .map(c => ({
      name: c.campaign_name,
      spend: c.spend,
      acos: Math.round((c.acos as number) * 100 * 10) / 10, // display as %
      orders: c.orders,
      fill: (c.acos as number) > 0.4 ? colors.negative
          : (c.acos as number) > 0.25 ? colors.amber
          : colors.positive,
    }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">ACOS vs Spend (bubble = orders)</p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="spend" name="Spend" type="number"
            tick={{ fontSize: 10, fill: colors.muted }}
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
            label={{ value: 'Spend', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: colors.muted }}
          />
          <YAxis
            dataKey="acos" name="ACOS" type="number" unit="%"
            tick={{ fontSize: 10, fill: colors.muted }}
            width={40}
          />
          <ZAxis dataKey="orders" range={[40, 400]} name="Orders" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as typeof data[0]
              return (
                <div className="bg-surface-card border border-border-default rounded-lg p-2 text-xs text-text-primary">
                  <p className="font-medium truncate max-w-[180px]">{d.name}</p>
                  <p>Spend: {formatINR(d.spend)}</p>
                  <p>ACOS: {d.acos}%</p>
                  <p>Orders: {d.orders}</p>
                </div>
              )
            }}
          />
          <Scatter data={data} fill={colors.teal}>
            {data.map((entry, i) => (
              <circle key={i} fill={entry.fill} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Default export ───────────────────────────────────────────────────────────

export default function CampaignCharts({ campaigns }: Props) {
  if (!campaigns.length) return null
  return (
    <div className="space-y-4">
      <KpiStrip campaigns={campaigns} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendSalesBar campaigns={campaigns} />
        <AcosBubble    campaigns={campaigns} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /path/to/repo/app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/adanalytics/CampaignCharts.tsx
git commit -m "feat(adanalytics): CampaignCharts — KPI strip, spend/sales bar, ACOS bubble"
```

---

### Task 4: `components/adanalytics/TargetingCharts.tsx`

**Files:**
- Create: `components/adanalytics/TargetingCharts.tsx`

**Interfaces:**
- Consumes: `TargetingViewRow`, `PlacementType` from `@/lib/adanalytics`
- Produces: `export default function TargetingCharts({ rows }: { rows: TargetingViewRow[] })`

- [ ] **Step 1: Create the component**

```tsx
// components/adanalytics/TargetingCharts.tsx
'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useChartColors } from '@/lib/hooks/use-chart-colors'
import { formatINR } from '@/lib/pl-engine/compute'
import type { TargetingViewRow, PlacementType } from '@/lib/adanalytics'

interface Props { rows: TargetingViewRow[] }

// KpiBox and KpiStrip identical to CampaignCharts — shared inline here

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-lg font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

function KpiStrip({ rows }: Props) {
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0)
  const totalClicks      = rows.reduce((s, r) => s + (r.clicks ?? 0), 0)
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
  const totalOrders      = rows.reduce((s, r) => s + (r.orders ?? 0), 0)
  const totalSales       = rows.reduce((s, r) => s + (r.sales ?? 0), 0)
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiBox label="Impressions"  value={totalImpressions.toLocaleString('en-IN')} />
      <KpiBox label="Avg CTR"      value={`${avgCtr.toFixed(2)}%`} />
      <KpiBox label="Total Orders" value={totalOrders.toLocaleString('en-IN')} />
      <KpiBox label="Ad Sales"     value={formatINR(totalSales)} />
    </div>
  )
}

// ── Donut helpers ─────────────────────────────────────────────────────────────

function SpendDonut({
  title,
  data,
  colors: colorList,
}: {
  title: string
  data: { name: string; value: number }[]
  colors: string[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
            dataKey="value" nameKey="name"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colorList[i % colorList.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: unknown) => [formatINR(v as number), 'Spend']}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <Legend
            formatter={(v) => {
              const entry = data.find(d => d.name === v)
              const pct = entry && total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0
              return <span style={{ fontSize: 11 }}>{v} ({pct}%)</span>
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Placement donut ──────────────────────────────────────────────────────────

const PLACEMENT_ORDER: PlacementType[] = ['Keyword', 'Product', 'Category', 'Auto']

function PlacementDonut({ rows }: Props) {
  const colors = useChartColors()
  const colorList = [colors.teal, colors.blue, colors.amber, colors.muted]

  const byPlacement = new Map<PlacementType, number>()
  for (const r of rows) {
    const key = r.placement
    byPlacement.set(key, (byPlacement.get(key) ?? 0) + (r.spend ?? 0))
  }

  const data = PLACEMENT_ORDER
    .filter(p => (byPlacement.get(p) ?? 0) > 0)
    .map(p => ({ name: p, value: byPlacement.get(p) ?? 0 }))

  return <SpendDonut title="Spend by Placement Type" data={data} colors={colorList} />
}

// ── Match type donut ─────────────────────────────────────────────────────────

const MATCH_ORDER = ['Exact', 'Phrase', 'Broad', 'Auto', 'Other']

function MatchTypeDonut({ rows }: Props) {
  const colors = useChartColors()
  const colorList = [colors.teal, colors.blue, colors.navy, colors.amber, colors.muted]

  const byMatch = new Map<string, number>()
  for (const r of rows) {
    const key = r.match_type ?? 'Other'
    const bucket = MATCH_ORDER.includes(key) ? key : 'Other'
    byMatch.set(bucket, (byMatch.get(bucket) ?? 0) + (r.spend ?? 0))
  }

  const data = MATCH_ORDER
    .filter(m => (byMatch.get(m) ?? 0) > 0)
    .map(m => ({ name: m, value: byMatch.get(m) ?? 0 }))

  return <SpendDonut title="Spend by Match Type" data={data} colors={colorList} />
}

// ── Default export ───────────────────────────────────────────────────────────

export default function TargetingCharts({ rows }: Props) {
  if (!rows.length) return null
  return (
    <div className="space-y-4">
      <KpiStrip rows={rows} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlacementDonut rows={rows} />
        <MatchTypeDonut rows={rows} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /path/to/repo/app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/adanalytics/TargetingCharts.tsx
git commit -m "feat(adanalytics): TargetingCharts — placement + match type donuts"
```

---

### Task 5: `components/adanalytics/AdTable.tsx`

**Files:**
- Create: `components/adanalytics/AdTable.tsx`

**Interfaces:**
- Produces:
  ```ts
  export default function AdTable({
    rows,       // CampaignRow[] | TargetingViewRow[]
    tab,        // 'campaigns' | 'targeting'
  }: {
    rows: Record<string, unknown>[]
    tab: 'campaigns' | 'targeting'
  })
  ```

- [ ] **Step 1: Create `components/adanalytics/AdTable.tsx`**

```tsx
// components/adanalytics/AdTable.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { formatINR } from '@/lib/pl-engine/compute'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import type { PlacementType } from '@/lib/adanalytics'

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  align: 'left' | 'right'
  render: (v: unknown, row: Record<string, unknown>) => React.ReactNode
  exportVal: (v: unknown) => string
  defaultVisible: boolean
}

function fmtN(v: unknown): string {
  const n = v as number | null
  return n == null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtPct(v: unknown): string {
  const n = v as number | null
  return n == null ? '—' : `${(n * 100).toFixed(2)}%`
}

function fmtAcos(v: unknown): { text: string; cls: string } {
  const n = v as number | null
  if (n == null) return { text: '—', cls: 'text-text-secondary' }
  const pct = n * 100
  const cls = n > 0.4 ? 'text-data-negative font-medium'
            : n > 0.25 ? 'text-data-amber font-medium'
            : 'text-data-positive font-medium'
  return { text: `${pct.toFixed(1)}%`, cls }
}

function matchColor(type: string | null): BadgeColor {
  const map: Record<string, BadgeColor> = { Exact: 'green', Phrase: 'blue', Broad: 'amber', Auto: 'slate' }
  return map[type ?? ''] ?? 'slate'
}

function placementColor(p: PlacementType): BadgeColor {
  const map: Record<PlacementType, BadgeColor> = { Keyword: 'teal', Product: 'blue', Category: 'amber', Auto: 'slate' }
  return map[p]
}

const CAMPAIGN_COLS: ColDef[] = [
  { key: 'campaign_name', label: 'Campaign', align: 'left', defaultVisible: true,
    render: v => <span className="font-medium text-text-primary max-w-[220px] truncate block">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'impressions', label: 'Impressions', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'clicks', label: 'Clicks', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'ctr', label: 'CTR', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtPct(v)}</span>,
    exportVal: v => fmtPct(v) },
  { key: 'cpc', label: 'CPC', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'spend', label: 'Spend', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'sales', label: 'Sales', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'acos', label: 'ACOS', align: 'right', defaultVisible: true,
    render: v => { const { text, cls } = fmtAcos(v); return <span className={`tabular-nums ${cls}`}>{text}</span> },
    exportVal: v => { const n = v as number | null; return n == null ? '' : `${(n * 100).toFixed(1)}%` } },
  { key: 'roas', label: 'RoAS', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{v == null ? '—' : `${(v as number).toFixed(1)}x`}</span>,
    exportVal: v => v == null ? '' : `${(v as number).toFixed(1)}x` },
  { key: 'orders', label: 'Orders', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'units', label: 'Units', align: 'right', defaultVisible: false,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'cvr', label: 'CVR', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtPct(v)}</span>,
    exportVal: v => fmtPct(v) },
]

const TARGETING_EXTRA_COLS: ColDef[] = [
  { key: 'targeting', label: 'Target', align: 'left', defaultVisible: true,
    render: v => <span className="text-text-primary max-w-[200px] truncate block">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'match_type', label: 'Match', align: 'left', defaultVisible: true,
    render: v => <StatusBadge label={String(v ?? '—')} color={matchColor(v as string)} />,
    exportVal: v => String(v ?? '') },
  { key: 'placement', label: 'Placement', align: 'left', defaultVisible: true,
    render: v => <StatusBadge label={String(v ?? '—')} color={placementColor(v as PlacementType)} />,
    exportVal: v => String(v ?? '') },
  { key: 'ad_group', label: 'Ad Group', align: 'left', defaultVisible: false,
    render: v => <span className="text-text-muted text-xs">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
]

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

function sortRows(
  rows: Record<string, unknown>[],
  key: string,
  dir: SortDir
): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? -Infinity
    const bv = b[key] ?? -Infinity
    if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(String(bv)) : String(bv).localeCompare(av)
    return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })
}

// ── CSV / XLSX export ─────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[], cols: ColDef[]): string {
  const escape = (s: string) =>
    s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  const header = cols.map(c => escape(c.label)).join(',')
  const body   = rows.map(r => cols.map(c => escape(c.exportVal(r[c.key]))).join(',')).join('\n')
  return `${header}\n${body}`
}

function downloadCSV(content: string, name: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

function downloadXLSX(rows: Record<string, unknown>[], cols: ColDef[], name: string) {
  const aoa = [
    cols.map(c => c.label),
    ...rows.map(r => cols.map(c => c.exportVal(r[c.key]))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ad Analytics')
  XLSX.writeFile(wb, name)
}

// ── Column visibility ─────────────────────────────────────────────────────────

const LS_KEY = 'mm_adtable_cols'

function loadVisibility(cols: ColDef[]): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set(cols.filter(c => c.defaultVisible).map(c => c.key))
}

function saveVisibility(visible: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...visible]))
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function AdTable({
  rows,
  tab,
}: {
  rows: Record<string, unknown>[]
  tab: 'campaigns' | 'targeting'
}) {
  const allCols: ColDef[] = tab === 'campaigns'
    ? CAMPAIGN_COLS
    : [...CAMPAIGN_COLS.filter(c => c.key !== 'campaign_name'), ...TARGETING_EXTRA_COLS, CAMPAIGN_COLS[0]].sort((a, b) => {
        // targeting: campaign first, then target, match, placement, rest
        const ORDER = ['campaign_name', 'targeting', 'match_type', 'placement', 'ad_group']
        const ai = ORDER.indexOf(a.key); const bi = ORDER.indexOf(b.key)
        if (ai >= 0 && bi >= 0) return ai - bi
        if (ai >= 0) return -1; if (bi >= 0) return 1
        return 0
      })

  // For targeting view, combine CAMPAIGN_COLS + TARGETING_EXTRA_COLS
  const baseCols: ColDef[] = tab === 'campaigns'
    ? CAMPAIGN_COLS
    : [
        CAMPAIGN_COLS[0], // campaign_name
        TARGETING_EXTRA_COLS[0], // targeting
        TARGETING_EXTRA_COLS[1], // match_type
        TARGETING_EXTRA_COLS[2], // placement
        TARGETING_EXTRA_COLS[3], // ad_group
        ...CAMPAIGN_COLS.slice(1), // rest of metrics
      ]

  const [visible, setVisible] = useState<Set<string>>(() => loadVisibility(baseCols))
  const [showColMenu, setShowColMenu]   = useState(false)
  const [sortKey, setSortKey]           = useState<string>('spend')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)

  useEffect(() => { setPage(1) }, [rows, tab, search])

  const activeCols = baseCols.filter(c => visible.has(c.key))

  const searchKey = tab === 'campaigns' ? 'campaign_name' : 'targeting'
  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r => String(r[searchKey] ?? '').toLowerCase().includes(q))
  }, [rows, search, searchKey])

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key); setSortDir('desc')
    }
  }

  function toggleCol(key: string) {
    const next = new Set(visible)
    next.has(key) ? next.delete(key) : next.add(key)
    setVisible(next)
    saveVisibility(next)
  }

  const exportName = `ad-analytics-${tab}-${new Date().toISOString().split('T')[0]}`

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={tab === 'campaigns' ? 'Search campaigns…' : 'Search targets…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm bg-surface-card border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <span className="text-xs text-text-muted">{filtered.length} rows</span>

        {/* Column toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColMenu(v => !v)}
            className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
          >
            Columns
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-9 z-20 bg-surface-card border border-border-default rounded-xl shadow-lg p-3 min-w-[160px] space-y-1">
              {baseCols.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
                  <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggleCol(c.key)} className="accent-accent-primary" />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={() => downloadCSV(toCSV(sorted, baseCols), `${exportName}.csv`)}
          className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
        >
          CSV
        </button>
        <button
          onClick={() => downloadXLSX(sorted, baseCols, `${exportName}.xlsx`)}
          className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
        >
          Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-surface-raised border-b border-border-default">
              {activeCols.map(c => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text-secondary transition-colors ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                  {sortKey === c.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-surface-raised transition-colors">
                {activeCols.map(c => (
                  <td
                    key={c.key}
                    className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render(row[c.key], row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border border-border-default rounded-lg hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border border-border-default rounded-lg hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /path/to/repo/app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/adanalytics/AdTable.tsx
git commit -m "feat(adanalytics): AdTable — sort, search, column toggle, CSV/XLSX export, pagination"
```

---

### Task 6: `AdAnalyticsClient.tsx` + Page Wiring

**Files:**
- Create: `app/(dashboard)/brands/[id]/keywords/AdAnalyticsClient.tsx`
- Delete: `app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx`
- Modify: `app/(dashboard)/brands/[id]/keywords/page.tsx`
- Modify: `app/(dashboard)/brands/[id]/page.tsx` — "Keywords" → "Ad Analytics" link text

**Interfaces:**
- Consumes: `CampaignCharts`, `TargetingCharts`, `AdTable`
- Consumes: `CampaignRow`, `TargetingViewRow` from `@/lib/adanalytics`

- [ ] **Step 1: Create `AdAnalyticsClient.tsx`**

```tsx
// app/(dashboard)/brands/[id]/keywords/AdAnalyticsClient.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import CampaignCharts  from '@/components/adanalytics/CampaignCharts'
import TargetingCharts from '@/components/adanalytics/TargetingCharts'
import AdTable         from '@/components/adanalytics/AdTable'
import { EmptyState }  from '@/components/ui/EmptyState'
import type { CampaignRow, TargetingViewRow } from '@/lib/adanalytics'

type Tab = 'campaigns' | 'targeting'

function fmt(d: Date): string { return d.toISOString().split('T')[0] }
function last30(): { from: string; to: string } {
  const to   = new Date()
  const from = new Date(); from.setDate(from.getDate() - 30)
  return { from: fmt(from), to: fmt(to) }
}

interface Props { brandId: string }

export default function AdAnalyticsClient({ brandId }: Props) {
  const [tab, setTab]           = useState<Tab>('campaigns')
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [targeting, setTargeting] = useState<TargetingViewRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [dateRange, setDateRange] = useState(last30)
  const [fromInput, setFromInput] = useState(last30().from)
  const [toInput, setToInput]     = useState(last30().to)

  const load = useCallback(async (view: Tab, from: string, to: string) => {
    setLoading(true)
    try {
      const r = await fetch(
        `/api/brands/${brandId}/targeting?view=${view}&from=${from}&to=${to}`
      )
      if (!r.ok) return
      const data = await r.json()
      if (view === 'campaigns') setCampaigns(data as CampaignRow[])
      else                       setTargeting(data as TargetingViewRow[])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  // Initial load — fetch both views
  useEffect(() => {
    const { from, to } = dateRange
    Promise.all([
      load('campaigns', from, to),
      fetch(`/api/brands/${brandId}/targeting?view=targeting&from=${from}&to=${to}`)
        .then(r => r.json()).then(d => setTargeting(d as TargetingViewRow[])),
    ]).finally(() => setLoading(false))
  }, [brandId, dateRange, load])

  function applyDates() {
    if (!fromInput || !toInput) return
    setDateRange({ from: fromInput, to: toInput })
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadMsg('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await fetch(`/api/brands/${brandId}/targeting`, { method: 'POST', body: fd })
      const json = await r.json()
      if (r.ok) {
        setUploadMsg(`✓ ${json.inserted} rows imported`)
        // Reload both views
        const { from, to } = dateRange
        await Promise.all([
          load('campaigns', from, to),
          fetch(`/api/brands/${brandId}/targeting?view=targeting&from=${from}&to=${to}`)
            .then(r2 => r2.json()).then(d => setTargeting(d as TargetingViewRow[])),
        ])
      } else {
        setUploadMsg(`✗ ${json.error}`)
      }
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  const hasData = campaigns.length > 0 || targeting.length > 0

  return (
    <div className="space-y-5">
      {/* Upload bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-border-default rounded-xl px-4 py-3">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-text-primary">Upload SP Targeting Report</p>
          <p className="text-xs text-text-muted">Advertising Console → Reports → Sponsored Products → Targeting (.xlsx)</p>
        </div>
        {uploadMsg && (
          <span className={`text-xs ${uploadMsg.startsWith('✓') ? 'text-data-positive' : 'text-data-negative'}`}>
            {uploadMsg}
          </span>
        )}
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={upload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-1.5 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 text-text-on-brand text-sm font-medium rounded-lg transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Last 7d',  fn: () => { const t = new Date(), f = new Date(); f.setDate(f.getDate()-7);  return { from: fmt(f), to: fmt(t) } } },
          { label: 'Last 30d', fn: () => last30() },
          { label: 'MTD',      fn: () => { const n = new Date(); return { from: fmt(new Date(n.getFullYear(), n.getMonth(), 1)), to: fmt(n) } } },
        ].map(p => (
          <button
            key={p.label}
            onClick={() => { const r = p.fn(); setFromInput(r.from); setToInput(r.to); setDateRange(r) }}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              dateRange.from === p.fn().from && dateRange.to === p.fn().to
                ? 'bg-surface-sidebar text-text-on-brand border-transparent'
                : 'bg-surface-card border-border-default text-text-secondary hover:border-accent-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date" value={fromInput} onChange={e => setFromInput(e.target.value)}
          className="px-2 py-1.5 text-xs bg-surface-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <span className="text-text-muted text-xs">→</span>
        <input
          type="date" value={toInput} onChange={e => setToInput(e.target.value)}
          className="px-2 py-1.5 text-xs bg-surface-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <button
          onClick={applyDates}
          className="px-3 py-1.5 text-xs bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted py-8 text-center">Loading…</div>
      ) : !hasData ? (
        <EmptyState
          icon="📊"
          title="No ad data for this period"
          description="Upload a Sponsored Products Targeting report above to get started."
        />
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface-raised p-1 rounded-xl w-fit">
            {(['campaigns', 'targeting'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? 'bg-surface-card shadow-sm text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t === 'campaigns' ? `Campaigns (${campaigns.length})` : `Targeting (${targeting.length})`}
              </button>
            ))}
          </div>

          {/* Charts */}
          {tab === 'campaigns'
            ? <CampaignCharts  campaigns={campaigns} />
            : <TargetingCharts rows={targeting} />
          }

          {/* Table */}
          <AdTable
            rows={(tab === 'campaigns' ? campaigns : targeting) as Record<string, unknown>[]}
            tab={tab}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `keywords/page.tsx`**

Replace `KeywordsClient` import and usage:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdAnalyticsClient from './AdAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdAnalyticsPage({ params }: Props) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {brand?.name ?? 'Brand'} — Ad Analytics
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Campaigns, keywords, and product placement performance from SP Targeting reports.
        </p>
      </div>
      <AdAnalyticsClient brandId={brandId} />
    </div>
  )
}
```

- [ ] **Step 3: Update brand page link text**

In `app/(dashboard)/brands/[id]/page.tsx`, find:
```tsx
>
  Keywords
</Link>
```
Change to:
```tsx
>
  Ad Analytics
</Link>
```

- [ ] **Step 4: Delete `KeywordsClient.tsx`**

```bash
rm app/app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx
```

- [ ] **Step 5: TypeScript check**

```bash
cd /path/to/repo/app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
cd /path/to/repo/app && npx vitest run
```
Expected: all tests pass including the new adanalytics tests.

- [ ] **Step 7: Smoke test in browser**

Navigate to `http://localhost:3000/brands/YOUR_BRAND_ID/keywords`

Check:
1. Page loads without error
2. Date preset buttons work (Last 7d, Last 30d, MTD)
3. "Campaigns" tab: KPI strip shows real numbers, bar chart renders, bubble chart renders
4. "Targeting" tab: donut charts render with placement + match type breakdown
5. Table: click headers to sort, type in search to filter, toggle Columns dropdown, click CSV/Excel to download
6. Upload a new file → success message → data refreshes

- [ ] **Step 8: Commit**

```bash
git add \
  "app/app/(dashboard)/brands/[id]/keywords/AdAnalyticsClient.tsx" \
  "app/app/(dashboard)/brands/[id]/keywords/page.tsx" \
  "app/app/(dashboard)/brands/[id]/page.tsx"
git rm "app/app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx"
git commit -m "feat(adanalytics): AdAnalyticsClient — campaigns + targeting views, charts, table, export"
```
