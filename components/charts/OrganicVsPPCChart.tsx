'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/pl-engine/compute'

interface WeeklyPoint {
  week: string
  ppcSales: number
  settSales: number
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

export default function OrganicVsPPCChart({ data, hasPPC }: Props) {
  if (!hasPPC) return EMPTY

  const chartData = data.map(d => ({
    week: d.week.replace(/^\d{4}-/, ''),
    organic: Math.max(0, d.settSales - d.ppcSales),
    ppc: d.ppcSales,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 mb-3">Organic vs PPC Sales</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis
            tickFormatter={v => `₹${((v as number) / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10 }}
            width={50}
          />
          <Tooltip formatter={(v: unknown) => formatINR(v as number)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="organic" name="Organic" stackId="a" fill="#1E2761" />
          <Bar dataKey="ppc" name="PPC" stackId="a" fill="#0D9488" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
