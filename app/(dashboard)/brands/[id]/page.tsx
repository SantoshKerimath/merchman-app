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
import AdvertisingKPIs from '@/components/dashboard/AdvertisingKPIs'
import DateFilterBar from '@/components/dashboard/DateFilterBar'
import ProductTable, { type SkuRow } from '@/components/dashboard/ProductTable'
import DailySalesChart from '@/components/charts/DailySalesChart'
import OrganicVsPPCChart from '@/components/charts/OrganicVsPPCChart'
import ACOSTrendChart from '@/components/charts/ACOSTrendChart'
import SpendVsSalesChart from '@/components/charts/SpendVsSalesChart'
import SessionsConversionChart from '@/components/charts/SessionsConversionChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiCard } from '@/components/ui/KpiCard'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const week = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
  )
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

const n = (v: number | null | undefined) => v ?? 0

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { id } = await params
  const { from, to } = await searchParams
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) notFound()

  // Settlements (date-filtered)
  let settlementQuery = supabase
    .from('settlements')
    .select(
      'sku, quantity, product_sales, fba_fees, selling_fees, tcs_cgst, tcs_sgst, tcs_igst, tds, transaction_date'
    )
    .eq('brand_id', id)
    .not('product_sales', 'is', null)
  if (from) settlementQuery = settlementQuery.gte('transaction_date', from)
  if (to) settlementQuery = settlementQuery.lte('transaction_date', to)
  const { data: stats } = await settlementQuery

  // SKUs with COGS (always all-time — COGS are not date-specific)
  const { data: skuRows } = await supabase.rpc('get_brand_skus_with_cogs', {
    p_brand_id: id,
  })

  // PPC (date-filtered by start_date)
  let ppcQuery = supabase
    .from('ppc_data')
    .select('spend, sales, start_date, orders, units')
    .eq('brand_id', id)
  if (from) ppcQuery = ppcQuery.gte('start_date', from)
  if (to) ppcQuery = ppcQuery.lte('start_date', to)
  const { data: ppcStats } = await ppcQuery

  // Business metrics (date-filtered)
  let bizQuery = supabase
    .from('business_metrics')
    .select('date, sessions, conversion_rate')
    .eq('brand_id', id)
    .order('date')
  if (from) bizQuery = bizQuery.gte('date', from)
  if (to)   bizQuery = bizQuery.lte('date', to)
  const { data: bizMetrics } = await bizQuery

  const totalRows = stats?.length ?? 0

  // --- P&L totals ---
  const totalSales = stats?.reduce((s, r) => s + n(r.product_sales), 0) ?? 0
  const totalFBA = stats?.reduce((s, r) => s + Math.abs(n(r.fba_fees)), 0) ?? 0
  const totalFees = stats?.reduce((s, r) => s + Math.abs(n(r.selling_fees)), 0) ?? 0
  const totalTCS =
    stats?.reduce((s, r) => s + n(r.tcs_cgst) + n(r.tcs_sgst) + n(r.tcs_igst), 0) ?? 0
  const totalTDS = stats?.reduce((s, r) => s + Math.abs(n(r.tds)), 0) ?? 0
  const grossProfit = totalSales - totalFBA - totalFees - totalTCS - totalTDS
  const grossMargin = totalSales > 0 ? grossProfit / totalSales : 0

  // --- COGS ---
  const cogsBySku: Record<string, number> = {}
  for (const row of skuRows ?? []) {
    if (row.cogs && row.sku) cogsBySku[row.sku] = row.cogs
  }
  const totalCOGS =
    stats?.reduce((s, r) => {
      const cogs = r.sku ? (cogsBySku[r.sku] ?? 0) : 0
      return s + cogs * n(r.quantity)
    }, 0) ?? 0
  const hasFullCogs =
    (skuRows ?? []).length > 0 && (skuRows ?? []).every(r => r.cogs !== null && r.cogs > 0)
  const hasAnyCogs = Object.keys(cogsBySku).length > 0

  // --- Advertising totals ---
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

  // --- Chart data: daily sales ---
  const dailySalesMap: Record<string, number> = {}
  for (const r of stats ?? []) {
    const date = r.transaction_date.split('T')[0]
    dailySalesMap[date] = (dailySalesMap[date] ?? 0) + n(r.product_sales)
  }
  const dailySalesData = Object.entries(dailySalesMap)
    .map(([date, sales]) => ({ date, sales }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // --- Chart data: weekly PPC ---
  const ppcWeekMap: Record<string, { spend: number; ppcSales: number }> = {}
  for (const r of ppcStats ?? []) {
    const wk = isoWeek(r.start_date)
    ppcWeekMap[wk] ??= { spend: 0, ppcSales: 0 }
    ppcWeekMap[wk].spend += n(r.spend)
    ppcWeekMap[wk].ppcSales += n(r.sales)
  }
  const settWeekMap: Record<string, number> = {}
  for (const r of stats ?? []) {
    const wk = isoWeek(r.transaction_date.split('T')[0])
    settWeekMap[wk] = (settWeekMap[wk] ?? 0) + n(r.product_sales)
  }
  const weeklyPPCData = Object.keys(ppcWeekMap)
    .sort()
    .map(week => ({
      week,
      spend: ppcWeekMap[week].spend,
      ppcSales: ppcWeekMap[week].ppcSales,
      settSales: settWeekMap[week] ?? 0,
      acos:
        ppcWeekMap[week].ppcSales > 0
          ? ppcWeekMap[week].spend / ppcWeekMap[week].ppcSales
          : null,
    }))

  // --- Per-SKU product table ---
  const skuAggMap: Record<string, SkuRow> = {}
  for (const r of stats ?? []) {
    const sku = r.sku ?? 'Unknown'
    if (!skuAggMap[sku]) {
      skuAggMap[sku] = {
        sku,
        sales: 0,
        units: 0,
        orders: 0,
        grossProfit: 0,
        cogs: cogsBySku[sku] ?? null,
        netProfit: null,
      }
    }
    const gp =
      n(r.product_sales)
      - Math.abs(n(r.fba_fees))
      - Math.abs(n(r.selling_fees))
      - n(r.tcs_cgst) - n(r.tcs_sgst) - n(r.tcs_igst)
      - Math.abs(n(r.tds))
    skuAggMap[sku].sales += n(r.product_sales)
    skuAggMap[sku].units += n(r.quantity)
    skuAggMap[sku].orders += 1
    skuAggMap[sku].grossProfit += gp
  }
  const productTableData: SkuRow[] = Object.values(skuAggMap).map(row => ({
    ...row,
    netProfit: row.cogs !== null ? row.grossProfit - row.cogs * row.units : null,
  }))

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title={brand.name}
        breadcrumb={[{ label: 'Command Center', href: '/dashboard' }]}
        actions={
          <>
            <Link
              href={`/brands/${id}/keywords`}
              className="text-sm border border-border-default text-text-secondary font-medium px-4 py-2 rounded-lg hover:bg-surface-raised transition-colors"
            >
              Ad Analytics
            </Link>
            <Link
              href={`/brands/${id}/upload`}
              className="text-sm bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Upload data
            </Link>
          </>
        }
      />

      {/* Date filter */}
      <DateFilterBar
        brandId={id}
        currentFrom={from ?? null}
        currentTo={to ?? null}
      />

      {/* No data state — distinguish "no uploads" vs "date range empty" */}
      {totalRows === 0 && (from || to) && (
        <SectionCard padding="lg" className="mt-4">
          <EmptyState
            title="No data in this date range"
            description="Try a wider range or view all-time data."
            action={{ label: 'View all time', href: `/brands/${id}` }}
          />
        </SectionCard>
      )}

      {totalRows === 0 && !from && !to && (
        <SectionCard padding="lg" className="mt-4">
          <EmptyState
            title="No data yet"
            description="Upload your Amazon settlement file to see P&L."
            action={{ label: 'Upload settlement data', href: `/brands/${id}/upload` }}
          />
        </SectionCard>
      )}

      {totalRows > 0 && (
        <>
          {/* 1. Advertising KPIs */}
          <AdvertisingKPIs
            ppcSpend={ppcSpend}
            ppcSales={ppcSales}
            organicSales={organicSales}
            acos={acos}
            roas={roas}
            tacos={tacos}
            hasPPC={hasPPC}
          />

          {/* 2. P&L strip */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <KpiCard label="Total Sales" value={formatINR(totalSales)} sub={`${totalRows.toLocaleString()} transactions`} />
            <KpiCard label="FBA Fees" value={formatINR(totalFBA)} sub="Fulfilment cost" variant="negative" />
            <KpiCard label="Referral Fees" value={formatINR(totalFees)} sub="Selling fees" variant="negative" />
            <KpiCard label="TCS + TDS" value={formatINR(totalTCS + totalTDS)} sub="Tax deductions" variant="negative" />
            <KpiCard
              label="Net Revenue"
              value={formatINR(grossProfit)}
              sub={formatPercent(grossMargin) + ' of sales'}
              variant={grossProfit >= 0 ? 'positive' : 'negative'}
            />
            <KpiCard
              label="Contribution Margin"
              value={hasAnyCogs || hasPPC ? formatINR(netProfit) : '—'}
              sub={hasFullCogs && hasPPC ? formatPercent(netMargin) + ' of sales' : 'Enter COGS to unlock'}
              variant={hasAnyCogs || hasPPC ? (netProfit >= 0 ? 'positive' : 'negative') : 'default'}
            />
          </div>

          {/* 3. Charts grid */}
          <SectionCard title="Performance" padding="lg" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DailySalesChart data={dailySalesData} />
              <OrganicVsPPCChart data={weeklyPPCData} hasPPC={hasPPC} />
              <ACOSTrendChart data={weeklyPPCData} hasPPC={hasPPC} />
              <SpendVsSalesChart data={weeklyPPCData} hasPPC={hasPPC} />
              <SessionsConversionChart data={bizMetrics ?? []} />
            </div>
          </SectionCard>

          {/* 4. Product breakdown (with inline COGS editing) */}
          <ProductTable data={productTableData} brandId={id} />
        </>
      )}
    </div>
  )
}
