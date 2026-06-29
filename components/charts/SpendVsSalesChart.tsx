'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/pl-engine/compute'
import { useChartColors } from '@/lib/hooks/use-chart-colors'

interface WeeklyPoint {
  week: string
  spend: number
  ppcSales: number
}

interface Props {
  data: WeeklyPoint[]
  hasPPC: boolean
}

export default function SpendVsSalesChart({ data, hasPPC }: Props) {
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
    spend: d.spend,
    sales: d.ppcSales,
  }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">PPC Spend vs Sales</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
          <Area
            type="monotone"
            dataKey="sales"
            name="PPC Sales"
            stroke={colors.teal}
            fill={colors.teal}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke={colors.negative}
            fill={colors.negative}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
