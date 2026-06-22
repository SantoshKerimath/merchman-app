// app/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatINR, formatPercent } from '@/lib/pl-engine/compute'
import SortBar from '@/components/dashboard/SortBar'
import PinButton from '@/components/dashboard/PinButton'

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

  const portfolioCards = [
    { label: 'Total Sales', value: formatINR(portSales) },
    { label: 'Net Revenue', value: formatINR(portNetRevenue) },
    { label: 'PPC Spend', value: portPpcSpend > 0 ? formatINR(portPpcSpend) : '—' },
    { label: 'Blended ACOS', value: portAcos !== null ? formatPercent(portAcos) : '—' },
    { label: 'Net after Ads', value: formatINR(portNetAfterAds) },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2761]">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">All brands at a glance</p>
        </div>
        <Link
          href="/settings"
          className="text-sm bg-[#0D9488] text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add brand
        </Link>
      </div>

      {/* Empty state */}
      {(!brands || brands.length === 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No brands yet</h2>
          <p className="text-sm text-slate-500 mb-6">Add your first brand to start tracking revenue.</p>
          <Link
            href="/settings"
            className="inline-block bg-[#0D9488] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Add brand
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          {/* Portfolio strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {portfolioCards.map(k => (
              <div
                key={k.label}
                className="rounded-xl p-3 border bg-[#1E2761] border-[#1E2761] text-white"
              >
                <p className="text-xs font-medium mb-1 text-white/60">{k.label}</p>
                <p className="text-base font-bold text-white">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Sort bar */}
          <SortBar currentSort={sort} />

          {/* Brand list */}
          <div className="grid gap-3 mt-3">
            {sorted.map(({ brand, totalSales, netRevenue, ppcSpend, acos, hasData, hasCogs, hasHighAcos, rows }) => (
              <div
                key={brand.id}
                className="relative bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <PinButton brandId={brand.id} isPinned={brand.is_pinned ?? false} />
                <Link
                  href={`/brands/${brand.id}`}
                  className="flex items-center justify-between p-5 pl-12"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{brand.name}</h3>
                      {hasHighAcos && (
                        <span className="text-xs bg-red-50 text-red-500 font-medium px-2 py-0.5 rounded-full border border-red-100">
                          ⚠ High ACOS
                        </span>
                      )}
                      {hasData && !hasCogs && (
                        <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2 py-0.5 rounded-full border border-amber-100">
                          No COGS
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {hasData
                        ? `${rows.toLocaleString()} transactions`
                        : 'No data — upload settlement file'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-slate-400">Total Sales</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {hasData ? formatINR(totalSales) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Net Revenue</p>
                      <p className={`text-sm font-semibold ${
                        !hasData ? 'text-slate-400' : netRevenue >= 0 ? 'text-teal-600' : 'text-red-500'
                      }`}>
                        {hasData ? formatINR(netRevenue) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">PPC Spend</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {ppcSpend > 0 ? formatINR(ppcSpend) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ACOS</p>
                      <p className={`text-sm font-semibold ${
                        acos === null
                          ? 'text-slate-400'
                          : acos > 0.30
                          ? 'text-red-500'
                          : 'text-teal-600'
                      }`}>
                        {acos !== null ? formatPercent(acos) : '—'}
                      </p>
                    </div>
                    {!hasData && (
                      <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2.5 py-1 rounded-full">
                        Upload data
                      </span>
                    )}
                    <span className="text-slate-300">›</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
