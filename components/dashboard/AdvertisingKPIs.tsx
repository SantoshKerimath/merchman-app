import { formatINR, formatPercent } from '@/lib/pl-engine/compute'

interface Props {
  ppcSpend: number
  ppcSales: number
  organicSales: number
  acos: number | null
  roas: number | null
  tacos: number | null
  hasPPC: boolean
}

export default function AdvertisingKPIs({
  ppcSpend,
  ppcSales,
  organicSales,
  acos,
  roas,
  tacos,
  hasPPC,
}: Props) {
  if (!hasPPC) {
    return (
      <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-xl p-5 mb-4 text-center">
        <p className="text-sm font-medium text-teal-700">No advertising data yet</p>
        <p className="text-xs text-teal-600 mt-0.5">
          Upload your settlement file — PPC Database tab is parsed automatically.
        </p>
      </div>
    )
  }

  const cards = [
    {
      label: 'PPC Spend',
      value: formatINR(ppcSpend),
      sub: 'Ad cost',
    },
    {
      label: 'PPC Sales',
      value: formatINR(ppcSales),
      sub: 'Attributed to ads',
    },
    {
      label: 'Organic Sales',
      value: formatINR(organicSales),
      sub: 'Non-ad revenue',
    },
    {
      label: 'ACOS',
      value: acos !== null ? formatPercent(acos) : '—',
      sub: 'Lower is better',
    },
    {
      label: 'RoAS',
      value: roas !== null ? `${roas.toFixed(2)}x` : '—',
      sub: 'Higher is better',
    },
    {
      label: 'TACoS',
      value: tacos !== null ? formatPercent(tacos) : '—',
      sub: 'True ad efficiency',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl p-4 border bg-[#0D9488] border-[#0D9488] text-white"
        >
          <p className="text-xs font-medium mb-1 text-white/60">{c.label}</p>
          <p className="text-lg font-bold text-white">{c.value}</p>
          <p className="text-xs mt-0.5 text-white/50">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
