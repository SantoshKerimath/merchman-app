import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatINR, formatPercent } from '@/lib/pl-engine/compute'
import Link from 'next/link'

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

  const { data: stats } = await supabase
    .from('settlements')
    .select('product_sales, fba_fees, selling_fees, tcs_cgst, tcs_sgst, tcs_igst, tds, quantity')
    .eq('brand_id', id)
    .not('product_sales', 'is', null)

  const n = (v: number | null) => v ?? 0

  const totalSales = stats?.reduce((s, r) => s + n(r.product_sales), 0) ?? 0
  const totalFBA = stats?.reduce((s, r) => s + Math.abs(n(r.fba_fees)), 0) ?? 0
  const totalFees = stats?.reduce((s, r) => s + Math.abs(n(r.selling_fees)), 0) ?? 0
  const totalTCS = stats?.reduce((s, r) => s + n(r.tcs_cgst) + n(r.tcs_sgst) + n(r.tcs_igst), 0) ?? 0
  const totalTDS = stats?.reduce((s, r) => s + Math.abs(n(r.tds)), 0) ?? 0
  const grossProfit = totalSales - totalFBA - totalFees - totalTCS - totalTDS
  const grossMargin = totalSales > 0 ? grossProfit / totalSales : 0
  const totalRows = stats?.length ?? 0

  const kpis = [
    { label: 'Total Sales', value: formatINR(totalSales), sub: `${totalRows.toLocaleString()} transactions` },
    { label: 'FBA Fees', value: formatINR(totalFBA), sub: 'Fulfilment cost' },
    { label: 'Referral Fees', value: formatINR(totalFees), sub: 'Selling fees' },
    { label: 'TCS + TDS', value: formatINR(totalTCS + totalTDS), sub: 'Tax deductions' },
    { label: 'Gross Profit', value: formatINR(grossProfit), sub: formatPercent(grossMargin) + ' margin', highlight: true },
  ]

  return (
    <div className="p-6">
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

      {totalRows === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">📂</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No data yet</h2>
          <p className="text-sm text-slate-500 mb-6">Upload your Amazon settlement file to see P&L.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {kpis.map(k => (
              <div
                key={k.label}
                className={`rounded-xl p-4 border ${
                  k.highlight
                    ? 'bg-[#1E2761] border-[#1E2761] text-white'
                    : 'bg-white border-slate-200'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${k.highlight ? 'text-white/60' : 'text-slate-400'}`}>
                  {k.label}
                </p>
                <p className={`text-lg font-bold ${k.highlight ? 'text-white' : 'text-slate-800'}`}>
                  {k.value}
                </p>
                <p className={`text-xs mt-0.5 ${k.highlight ? 'text-white/50' : 'text-slate-400'}`}>
                  {k.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <strong>Note:</strong> COGS not yet entered — gross profit shown. Add product COGS in Settings to see net profit.
          </div>
        </>
      )}
    </div>
  )
}
