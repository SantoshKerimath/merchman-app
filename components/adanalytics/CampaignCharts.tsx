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
