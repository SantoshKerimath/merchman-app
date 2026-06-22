## Task 11: SessionsConversionChart + Brand Page Update

**Files:**
- Create: `app/components/charts/SessionsConversionChart.tsx`
- Modify: `app/app/(dashboard)/brands/[id]/page.tsx`

**Interfaces:**
- Consumes: `business_metrics` table via Supabase query on brand page, `business_metrics` Row type
- Produces: `SessionsConversionChart` component with `data: SessionMetric[]` prop; gear icon on brand page header

- [ ] **Step 1: Create `app/components/charts/SessionsConversionChart.tsx`**

```typescript
// app/components/charts/SessionsConversionChart.tsx
'use client'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface SessionMetric {
  date: string
  sessions: number | null
  conversion_rate: number | null
}

interface Props {
  data: SessionMetric[]
}

export default function SessionsConversionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">No sessions data — sync Business Report to unlock</p>
      </div>
    )
  }

  const formatted = data.map(d => ({
    date: d.date.slice(5), // MM-DD
    sessions: d.sessions,
    cvr: d.conversion_rate !== null ? +(d.conversion_rate * 100).toFixed(2) : null,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-[#1E2761] mb-3">Sessions & Conversion Rate</p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'CVR %' ? [`${value}%`, name] : [value.toLocaleString(), name]
            }
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sessions"
            stroke="#1E2761"
            strokeWidth={2}
            dot={false}
            name="Sessions"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cvr"
            stroke="#0D9488"
            strokeWidth={2}
            dot={false}
            name="CVR %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Modify `app/app/(dashboard)/brands/[id]/page.tsx`**

Add after the existing imports:
```typescript
import SessionsConversionChart from '@/components/charts/SessionsConversionChart'
```

Add business metrics query after the existing `ppcStats` query:
```typescript
  // Business metrics (date-filtered)
  let bizQuery = supabase
    .from('business_metrics')
    .select('date, sessions, conversion_rate')
    .eq('brand_id', id)
    .order('date')
  if (from) bizQuery = bizQuery.gte('date', from)
  if (to)   bizQuery = bizQuery.lte('date', to)
  const { data: bizMetrics } = await bizQuery
```

Change the header `<Link>` block to add gear icon:
```tsx
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600">
              Command Center
            </Link>{' '}
            › {brand.name}
          </p>
          <h1 className="text-2xl font-bold text-[#1E2761] mt-0.5">{brand.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/brands/${id}/settings`}
            className="text-sm border border-slate-200 text-slate-500 font-semibold px-3 py-2 rounded-lg hover:border-slate-300 transition-colors"
            title="Settings"
          >
            ⚙
          </Link>
          <Link
            href={`/brands/${id}/upload`}
            className="text-sm bg-[#0D9488] text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Upload data
          </Link>
        </div>
      </div>
```

Add `SessionsConversionChart` to charts grid (inside `{totalRows > 0 && (...)}`, after existing 4 charts):
```tsx
          {/* 3. Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DailySalesChart data={dailySalesData} />
            <OrganicVsPPCChart data={weeklyPPCData} hasPPC={hasPPC} />
            <ACOSTrendChart data={weeklyPPCData} hasPPC={hasPPC} />
            <SpendVsSalesChart data={weeklyPPCData} hasPPC={hasPPC} />
            <SessionsConversionChart data={bizMetrics ?? []} />
          </div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Manual verify**

Load any brand page. Confirm: gear icon in header → links to `/brands/[id]/settings`. Chart shows empty state "No sessions data" (expected — no business metrics yet). After syncing business report from settings, chart renders.

- [ ] **Step 5: Commit**

```bash
cd app && git add components/charts/SessionsConversionChart.tsx app/\(dashboard\)/brands/\[id\]/page.tsx && git commit -m "feat(ui): sessions & conversion rate chart + settings gear icon on brand page"
```

---

