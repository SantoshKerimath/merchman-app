'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/pl-engine/compute'

interface WeeklyPoint {
  week: string
  spend: number
  ppcSales: number
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

export default function SpendVsSalesChart({ data, hasPPC }: Props) {
  if (!hasPPC) return EMPTY

  const chartData = data.map(d => ({
    week: d.week.replace(/^\d{4}-/, ''),
    spend: d.spend,
    sales: d.ppcSales,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 mb-3">PPC Spend vs Sales</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10 }}
            width={50}
          />
          <Tooltip formatter={(v: unknown) => formatINR(v as number)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="sales"
            name="PPC Sales"
            stroke="#0D9488"
            fill="#0D9488"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke="#f43f5e"
            fill="#f43f5e"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
