'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/pl-engine/compute'
import { useChartColors } from '@/lib/hooks/use-chart-colors'

interface WeeklyPoint {
  week: string
  ppcSales: number
  settSales: number
}

interface Props {
  data: WeeklyPoint[]
  hasPPC: boolean
}

export default function OrganicVsPPCChart({ data, hasPPC }: Props) {
  const colors = useChartColors()

  if (!hasPPC) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-6 flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-text-muted text-center">No PPC data — upload XLSX with PPC Database tab</p>
      </div>
    )
  }

  const chartData = data.map(d => ({
    week: d.week.replace(/^\d{4}-/, ''),
    organic: Math.max(0, d.settSales - d.ppcSales),
    ppc: d.ppcSales,
  }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">Organic vs PPC Sales</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: colors.muted }} />
          <YAxis
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: colors.muted }}
            width={50}
          />
          <Tooltip
            formatter={(v: unknown) => formatINR(v as number)}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="organic" name="Organic" stackId="a" fill={colors.navy} />
          <Bar dataKey="ppc" name="PPC" stackId="a" fill={colors.teal} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
