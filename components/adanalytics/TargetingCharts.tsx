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
