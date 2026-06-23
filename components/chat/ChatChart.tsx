'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie'
  title: string
  data: Record<string, unknown>[]
  xKey: string
  yKeys: string[]
  currency?: boolean
}

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const formatVal = (v: unknown, currency?: boolean) => {
  if (typeof v !== 'number') return String(v)
  if (currency) return `₹${v.toLocaleString('en-IN')}`
  return v.toLocaleString('en-IN')
}

export default function ChatChart({ config }: { config: ChartConfig }) {
  const { type, title, data, xKey, yKeys, currency } = config
  const tickFormatter = (v: unknown) => formatVal(v, currency)

  return (
    <div className="my-3 bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-slate-700 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatVal(v, currency)} />
            <Legend />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatVal(v, currency)} />
            <Legend />
            {yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
              />
            ))}
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatVal(v, currency)} />
            <Legend />
            {yKeys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length] + '33'}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatVal(v, currency)} />
            <Legend />
            {yKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
