import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  formatINR,
  formatPercent,
  computeACoS,
  computeTACOs,
  computeROAS,
} from '@/lib/pl-engine/compute'
import Link from 'next/link'
import ProductsCOGSTable from '@/components/dashboard/ProductsCOGSTable'
import AdvertisingKPIs from '@/components/dashboard/AdvertisingKPIs'

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) notFound()

  // Settlement stats
  const { data: stats } = await supabase
    .from('settlements')
    .select('sku, quantity, product_sales, fba_fees, selling_fees, tcs_cgst, tcs_sgst, tcs_igst, tds')
    .eq('brand_id', id)
    .not('product_sales', 'is', null)

  // SKUs with COGS
  const { data: skuRows } = await supabase.rpc('get_brand_skus_with_cogs', {
    p_brand_id: id,
  })

  // PPC aggregate
  const { data: ppcStats } = await supabase
    .from('ppc_data')
    .select('spend, sales')
    .eq('brand_id', id)

  const n = (v: number | null) => v ?? 0
  const totalRows = stats?.length ?? 0

  // --- P&L ---
  const totalSales = stats?.reduce((s, r) => s + n(r.product_sales), 0) ?? 0
  const totalFBA = stats?.reduce((s, r) => s + Math.abs(n(r.fba_fees)), 0) ?? 0
  const totalFees = stats?.reduce((s, r) => s + Math.abs(n(r.selling_fees)), 0) ?? 0
  const totalTCS = stats?.reduce((s, r) => s + n(r.tcs_cgst) + n(r.tcs_sgst) + n(r.tcs_igst), 0) ?? 0
  const totalTDS = stats?.reduce((s, r) => s + Math.abs(n(r.tds)), 0) ?? 0
  const grossProfit = totalSales - totalFBA - totalFees - totalTCS - totalTDS
  const grossMargin = totalSales > 0 ? grossProfit / totalSales : 0

  // --- COGS ---
  const cogsBySku: Record<string, number> = {}
  for (const row of skuRows ?? []) {
    if (row.cogs && row.sku) cogsBySku[row.sku] = row.cogs
  }
  const totalCOGS = stats?.reduce((s, r) => {
    const cogs = r.sku ? (cogsBySku[r.sku] ?? 0) : 0
    return s + cogs * n(r.quantity)
  }, 0) ?? 0
  const hasFullCogs = (skuRows ?? []).length > 0 &&
    (skuRows ?? []).every(r => r.cogs !== null && r.cogs > 0)
  const hasAnyCogs = Object.keys(cogsBySku).length > 0

  // --- Advertising ---
  const hasPPC = (ppcStats?.length ?? 0) > 0
  const ppcSpend = ppcStats?.reduce((s, r) => s + n(r.spend), 0) ?? 0
  const ppcSales = ppcStats?.reduce((s, r) => s + n(r.sales), 0) ?? 0
  const organicSales = totalSales - ppcSales
  const acos = hasPPC ? computeACoS(ppcSpend, ppcSales) : null
  const roas = hasPPC ? computeROAS(ppcSales, ppcSpend) : null
  const tacos = hasPPC ? computeTACOs(ppcSpend, totalSales) : null

  // --- Net Profit ---
  const netProfit = grossProfit - totalCOGS - ppcSpend
  const netMargin = totalSales > 0 ? netProfit / totalSales : 0

  const plKpis = [
    { label: 'Total Sales', value: formatINR(totalSales), sub: `${totalRows.toLocaleString()} transactions` },
    { label: 'FBA Fees', value: formatINR(totalFBA), sub: 'Fulfilment cost' },
    { label: 'Referral Fees', value: formatINR(totalFees), sub: 'Selling fees' },
    { label: 'TCS + TDS', value: formatINR(totalTCS + totalTDS), sub: 'Tax deductions' },
    { label: 'Gross Profit', value: formatINR(grossProfit), sub: formatPercent(grossMargin) + ' margin' },
    {
      label: 'Net Profit',
      value: hasAnyCogs || hasPPC ? formatINR(netProfit) : '—',
      sub: hasFullCogs && hasPPC
        ? formatPercent(netMargin) + ' margin'
        : 'COGS + PPC optional',
    },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600">Command Center</Link> › {brand.name}
          </p>
          <h1 className="text-2xl font-bold text-[#1E2761] mt-0.5">{brand.name}</h1>
        </div>
        <Link
          href={`/brands/${id}/upload`}
          className="text-sm bg-[#0D9488] text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Upload data
        </Link>
      </div>

      {/* No data state */}
      {totalRows === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">📂</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No data yet</h2>
          <p className="text-sm text-slate-500 mb-6">Upload your Amazon settlement file to see P&amp;L.</p>
          <Link
            href={`/brands/${id}/upload`}
            className="inline-block bg-[#0D9488] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Upload settlement data
          </Link>
        </div>
      )}

      {totalRows > 0 && (
        <>
          {/* 1. Advertising KPIs — primary (teal, top) */}
          <AdvertisingKPIs
            ppcSpend={ppcSpend}
            ppcSales={ppcSales}
            organicSales={organicSales}
            acos={acos}
            roas={roas}
            tacos={tacos}
            hasPPC={hasPPC}
          />

          {/* 2. P&L strip — secondary (navy, below, slightly smaller padding) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            {plKpis.map(k => (
              <div
                key={k.label}
                className="rounded-xl p-3 border bg-[#1E2761] border-[#1E2761] text-white"
              >
                <p className="text-xs font-medium mb-1 text-white/60">{k.label}</p>
                <p className="text-base font-bold text-white">{k.value}</p>
                <p className="text-xs mt-0.5 text-white/50">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* 3. Products & COGS */}
          <ProductsCOGSTable
            brandId={id}
            initialProducts={(skuRows ?? []).map(r => ({
              sku: r.sku,
              units_sold: Number(r.units_sold),
              product_sales: Number(r.product_sales),
              cogs: r.cogs ?? null,
              product_id: r.product_id ?? null,
            }))}
          />
        </>
      )}
    </div>
  )
}
