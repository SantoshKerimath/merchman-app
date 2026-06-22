'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

interface WeeklyPoint {
  week: string
  acos: number | null
}

interface Props {
  data: WeeklyPoint[]
  hasPPC: boolean
}

const EMPTY = (
  <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-center min-h-[220px]">
    <p className="text-sm text-slate-400 text-center">No PPC data — upload XLSX with PPC Database tab</p>
  </div>
)

export default function ACOSTrendChart({ data, hasPPC }: Props) {
  if (!hasPPC) return EMPTY

  const chartData = data
    .filter(d => d.acos !== null)
    .map(d => ({
      week: d.week.replace(/^\d{4}-/, ''),
      acos: d.acos !== null ? +((d.acos as number) * 100).toFixed(1) : null,
    }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 mb-3">ACOS Trend</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10 }}
            width={40}
          />
          <Tooltip formatter={(v: unknown) => [`${v}%`, 'ACOS']} />
          <ReferenceLine
            y={30}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: '30%', fontSize: 10, fill: '#f59e0b' }}
          />
          <Line
            type="monotone"
            dataKey="acos"
            stroke="#0D9488"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
