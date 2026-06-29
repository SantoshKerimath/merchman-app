import { formatINR, formatPercent } from '@/lib/pl-engine/compute'
import { KpiCard } from '@/components/ui/KpiCard'
import { EmptyState } from '@/components/ui/EmptyState'

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
      <div className="bg-accent-primary-subtle border border-accent-primary/20 rounded-xl p-5 mb-4">
        <EmptyState
          title="No advertising data yet"
          description="Upload your settlement file — the PPC Database tab is parsed automatically."
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
      <KpiCard label="PPC Spend" value={formatINR(ppcSpend)} sub="Ad cost" variant="negative" />
      <KpiCard label="PPC Sales" value={formatINR(ppcSales)} sub="Attributed" />
      <KpiCard label="Organic Sales" value={formatINR(organicSales)} sub="Non-ad revenue" variant="positive" />
      <KpiCard
        label="ACOS"
        value={acos !== null ? formatPercent(acos) : '—'}
        sub="Lower is better"
        variant={acos !== null ? (acos > 0.4 ? 'negative' : acos > 0.25 ? 'warning' : 'positive') : 'default'}
      />
      <KpiCard
        label="RoAS"
        value={roas !== null ? `${roas.toFixed(2)}x` : '—'}
        sub="Higher is better"
        variant={roas !== null ? (roas >= 4 ? 'positive' : roas >= 2 ? 'default' : 'negative') : 'default'}
      />
      <KpiCard
        label="TACoS"
        value={tacos !== null ? formatPercent(tacos) : '—'}
        sub="Total ad cost of sales"
        variant={tacos !== null && tacos > 0.15 ? 'warning' : 'positive'}
      />
    </div>
  )
}
