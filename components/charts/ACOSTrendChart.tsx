'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useChartColors } from '@/lib/hooks/use-chart-colors'

interface WeeklyPoint {
  week: string
  acos: number | null
}

interface Props {
  data: WeeklyPoint[]
  hasPPC: boolean
}

export default function ACOSTrendChart({ data, hasPPC }: Props) {
  const colors = useChartColors()

  if (!hasPPC) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-6 flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-text-muted text-center">No PPC data — upload XLSX with PPC Database tab</p>
      </div>
    )
  }

  const chartData = data
    .filter(d => d.acos !== null)
    .map(d => ({
      week: d.week.replace(/^\d{4}-/, ''),
      acos: d.acos !== null ? +((d.acos as number) * 100).toFixed(1) : null,
    }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">ACOS Trend</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: colors.muted }} />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: colors.muted }}
            width={40}
          />
          <Tooltip
            formatter={(v: unknown) => [`${v}%`, 'ACOS']}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <ReferenceLine
            y={30}
            stroke={colors.amber}
            strokeDasharray="4 4"
            label={{ value: '30%', fontSize: 10, fill: colors.amber }}
          />
          <Line
            type="monotone"
            dataKey="acos"
            stroke={colors.teal}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
