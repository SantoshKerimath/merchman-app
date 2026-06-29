'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/pl-engine/compute'
import { useChartColors } from '@/lib/hooks/use-chart-colors'

interface Props {
  data: { date: string; sales: number }[]
}

function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function DailySalesChart({ data }: Props) {
  const colors = useChartColors()

  if (data.length === 0) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-6 flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-text-muted">No sales data for this period</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">Daily Sales</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: colors.muted }} />
          <YAxis
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: colors.muted }}
            width={50}
          />
          <Tooltip
            formatter={(v: unknown) => [formatINR(v as number), 'Sales']}
            labelFormatter={(l: unknown) => fmtDate(l as string)}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <Line type="monotone" dataKey="sales" stroke={colors.teal} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
