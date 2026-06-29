// app/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatINR, formatPercent } from '@/lib/pl-engine/compute'
import SortBar from '@/components/dashboard/SortBar'
import PinButton from '@/components/dashboard/PinButton'
import { KpiCard } from '@/components/ui/KpiCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'

const n = (v: number | null | undefined) => v ?? 0

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort = 'sales' } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const brandStats = await Promise.all(
    (brands ?? []).map(async brand => {
      const [{ data: sett }, { data: ppc }, { count: cogsCount }] = await Promise.all([
        supabase
          .from('settlements')
          .select('product_sales, fba_fees, selling_fees, tcs_cgst, tcs_sgst, tcs_igst, tds')
          .eq('brand_id', brand.id)
          .not('product_sales', 'is', null),
        supabase
          .from('ppc_data')
          .select('spend, sales')
          .eq('brand_id', brand.id),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id)
          .not('cogs', 'is', null)
          .gt('cogs', 0),
      ])

      const totalSales = sett?.reduce((s, r) => s + n(r.product_sales), 0) ?? 0
      const totalFBA = sett?.reduce((s, r) => s + Math.abs(n(r.fba_fees)), 0) ?? 0
      const totalFees = sett?.reduce((s, r) => s + Math.abs(n(r.selling_fees)), 0) ?? 0
      const totalTCS = sett?.reduce((s, r) => s + n(r.tcs_cgst) + n(r.tcs_sgst) + n(r.tcs_igst), 0) ?? 0
      const totalTDS = sett?.reduce((s, r) => s + Math.abs(n(r.tds)), 0) ?? 0
      const netRevenue = totalSales - totalFBA - totalFees - totalTCS - totalTDS

      const ppcSpend = ppc?.reduce((s, r) => s + n(r.spend), 0) ?? 0
      const ppcSales = ppc?.reduce((s, r) => s + n(r.sales), 0) ?? 0
      const acos = ppcSales > 0 ? ppcSpend / ppcSales : null

      const hasData = (sett?.length ?? 0) > 0
      const hasCogs = (cogsCount ?? 0) > 0
      const hasHighAcos = acos !== null && acos > 0.30

      return {
        brand,
        totalSales,
        netRevenue,
        ppcSpend,
        acos,
        hasData,
        hasCogs,
        hasHighAcos,
        rows: sett?.length ?? 0,
      }
    })
  )

  // Portfolio totals
  const portSales = brandStats.reduce((s, b) => s + b.totalSales, 0)
  const portNetRevenue = brandStats.reduce((s, b) => s + b.netRevenue, 0)
  const portPpcSpend = brandStats.reduce((s, b) => s + b.ppcSpend, 0)
  const portPpcSales = brandStats.reduce((s, b) => s + (b.acos !== null ? b.ppcSpend / b.acos : 0), 0)
  const portAcos = portPpcSales > 0 ? portPpcSpend / portPpcSales : null
  const portNetAfterAds = portNetRevenue - portPpcSpend

  // Sort: pinned first, then by sort key desc (null ACOS → bottom)
  function sortVal(b: typeof brandStats[0]): number {
    if (sort === 'netrevenue') return b.netRevenue
    if (sort === 'acos') return b.acos ?? -Infinity
    return b.totalSales
  }

  const sorted = [...brandStats].sort((a, b) => {
    if (a.brand.is_pinned !== b.brand.is_pinned) {
      return a.brand.is_pinned ? -1 : 1
    }
    return sortVal(b) - sortVal(a)
  })

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Command Center"
        actions={
          <Link
            href="/settings"
            className="text-sm bg-accent-primary text-text-on-brand font-semibold px-4 py-2 rounded-lg hover:bg-accent-primary-hover transition-colors"
          >
            + Add brand
          </Link>
        }
      />

      {/* Empty state */}
      {(!brands || brands.length === 0) && (
        <SectionCard>
          <EmptyState
            icon="🏪"
            title="No brands yet"
            description="Add your first brand in Settings."
            action={{ label: 'Go to Settings', href: '/settings' }}
          />
        </SectionCard>
      )}

      {sorted.length > 0 && (
        <>
          {/* Portfolio strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <KpiCard label="Total Sales" value={formatINR(portSales)} sub="All brands" />
            <KpiCard label="Net Revenue" value={formatINR(portNetRevenue)} />
            <KpiCard label="PPC Spend" value={portPpcSpend > 0 ? formatINR(portPpcSpend) : '—'} />
            <KpiCard
              label="Blended ACOS"
              value={portAcos !== null ? formatPercent(portAcos) : '—'}
              variant={portAcos !== null && portAcos > 0.3 ? 'warning' : 'positive'}
            />
            <KpiCard label="Net after Ads" value={formatINR(portNetAfterAds)} />
          </div>

          {/* Sort bar */}
          <SortBar currentSort={sort} />

          {/* Brand list */}
          <div className="grid gap-3 mt-3">
            {sorted.map(({ brand, totalSales, netRevenue, ppcSpend, acos, hasData, hasCogs, hasHighAcos, rows }) => (
              <SectionCard
                key={brand.id}
                padding="sm"
                className="relative hover:border-accent-primary hover:shadow-sm transition-all"
              >
                <PinButton brandId={brand.id} isPinned={brand.is_pinned ?? false} />
                <Link
                  href={`/brands/${brand.id}`}
                  className="flex items-center justify-between p-5 pl-12"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-primary">{brand.name}</h3>
                      {hasHighAcos && (
                        <StatusBadge label="⚠ High ACOS" color="red" size="sm" />
                      )}
                      {hasData && !hasCogs && (
                        <StatusBadge label="No COGS" color="amber" size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {hasData
                        ? `${rows.toLocaleString()} transactions`
                        : 'No data — upload settlement file'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-text-muted">Total Sales</p>
                      <p className="text-sm font-semibold text-text-secondary">
                        {hasData ? formatINR(totalSales) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Net Revenue</p>
                      <p className={`text-sm font-semibold ${
                        !hasData ? 'text-text-muted' : netRevenue >= 0 ? 'text-data-positive' : 'text-data-negative'
                      }`}>
                        {hasData ? formatINR(netRevenue) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">PPC Spend</p>
                      <p className="text-sm font-semibold text-text-secondary">
                        {ppcSpend > 0 ? formatINR(ppcSpend) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">ACOS</p>
                      <p className={`text-sm font-semibold ${
                        acos === null
                          ? 'text-text-muted'
                          : acos > 0.30
                          ? 'text-data-negative'
                          : 'text-data-positive'
                      }`}>
                        {acos !== null ? formatPercent(acos) : '—'}
                      </p>
                    </div>
                    {!hasData && (
                      <StatusBadge label="Upload data" color="amber" size="md" />
                    )}
                    <span className="text-text-muted">›</span>
                  </div>
                </Link>
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
