import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatINR } from '@/lib/pl-engine/compute'

export default async function CommandCenterPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const brandStats = await Promise.all(
    (brands ?? []).map(async brand => {
      const { data } = await supabase
        .from('settlements')
        .select('product_sales, fba_fees, selling_fees, tcs_cgst, tcs_sgst, tcs_igst, tds')
        .eq('brand_id', brand.id)
        .not('product_sales', 'is', null)

      const n = (v: number | null) => v ?? 0
      const totalSales = data?.reduce((s, r) => s + n(r.product_sales), 0) ?? 0
      const totalFBA = data?.reduce((s, r) => s + Math.abs(n(r.fba_fees)), 0) ?? 0
      const totalFees = data?.reduce((s, r) => s + Math.abs(n(r.selling_fees)), 0) ?? 0
      const totalTax = data?.reduce((s, r) => s + n(r.tcs_cgst) + n(r.tcs_sgst) + n(r.tcs_igst), 0) ?? 0
      const grossProfit = totalSales - totalFBA - totalFees - totalTax
      const hasData = (data?.length ?? 0) > 0

      return { brand, totalSales, grossProfit, hasData, rows: data?.length ?? 0 }
    })
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2761]">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">All brands at a glance</p>
        </div>
        <Link href="/settings" className="text-sm bg-[#0D9488] text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          + Add brand
        </Link>
      </div>

      {(!brands || brands.length === 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No brands yet</h2>
          <p className="text-sm text-slate-500 mb-6">Add your first brand to start tracking P&amp;L.</p>
          <Link href="/settings" className="inline-block bg-[#0D9488] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors">
            Add brand
          </Link>
        </div>
      )}

      {brandStats.length > 0 && (
        <div className="grid gap-3">
          {brandStats.map(({ brand, totalSales, grossProfit, hasData, rows }) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-slate-800">{brand.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hasData ? `${rows.toLocaleString()} transactions` : 'No data — upload settlement file'}
                </p>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="text-xs text-slate-400">Total Sales</p>
                  <p className="text-sm font-semibold text-slate-700">{hasData ? formatINR(totalSales) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Gross Profit</p>
                  <p className={`text-sm font-semibold ${!hasData ? 'text-slate-400' : grossProfit >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {hasData ? formatINR(grossProfit) : '—'}
                  </p>
                </div>
                {!hasData && (
                  <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2.5 py-1 rounded-full">Upload data</span>
                )}
                <span className="text-slate-300">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
