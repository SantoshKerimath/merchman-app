'use client'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartColors } from '@/lib/hooks/use-chart-colors'

interface SessionMetric {
  date: string
  sessions: number | null
  conversion_rate: number | null
}

interface Props {
  data: SessionMetric[]
}

function fmtDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function SessionsConversionChart({ data }: Props) {
  const colors = useChartColors()

  if (data.length === 0) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-6 flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-text-muted">No sessions data yet. Connect Amazon to sync.</p>
      </div>
    )
  }

  const formatted = data.map(d => ({
    date: d.date,
    sessions: d.sessions,
    cvr: d.conversion_rate !== null ? +(d.conversion_rate * 100).toFixed(2) : null,
  }))

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted mb-3">Sessions &amp; Conversion Rate</p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: colors.muted }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.muted }} width={50} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.muted }} unit="%" width={40} />
          <Tooltip
            formatter={(v: unknown, name: unknown) =>
              name === 'CVR %'
                ? [`${v as number}%`, name as string]
                : [(v as number).toLocaleString(), name as string]
            }
            labelFormatter={(l: unknown) => fmtDate(l as string)}
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sessions"
            stroke={colors.navy}
            strokeWidth={2}
            dot={false}
            name="Sessions"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cvr"
            stroke={colors.teal}
            strokeWidth={2}
            dot={false}
            name="CVR %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
