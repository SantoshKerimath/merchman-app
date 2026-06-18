/**
 * P&L Compute Engine
 * Core financial calculations for MerchMan
 */

export interface SettlementRow {
  product_sales: number | null
  shipping_credits: number | null
  promo_rebates: number | null
  tcs_cgst: number | null
  tcs_sgst: number | null
  tcs_igst: number | null
  tds: number | null
  fba_fees: number | null
  selling_fees: number | null
  other_fees: number | null
}

export interface ProductCosts {
  cogs: number | null
  fba_fee: number | null
  referral_fee: number | null
}

export interface PLResult {
  total_sales: number
  total_income: number         // sales + shipping credits
  total_fees: number           // FBA + referral + other
  gross_profit: number         // income - fees
  cogs_total: number           // COGS × units
  net_profit: number           // gross - COGS - PPC
  net_margin: number           // net_profit / total_sales
  tcs_total: number            // TCS deducted (CGST + SGST + IGST)
  tds_total: number            // TDS Section 194-O
  has_cogs: boolean            // false if COGS not entered
}

export function computePL(
  settlements: SettlementRow[],
  units: number,
  ppcSpend: number,
  product?: ProductCosts | null
): PLResult {
  const n = (v: number | null) => v ?? 0

  let total_sales = 0
  let shipping_credits = 0
  let promo_rebates = 0
  let tcs_cgst = 0
  let tcs_sgst = 0
  let tcs_igst = 0
  let tds = 0
  let fba_fees = 0
  let selling_fees = 0
  let other_fees = 0

  for (const row of settlements) {
    total_sales     += n(row.product_sales)
    shipping_credits += n(row.shipping_credits)
    promo_rebates   += n(row.promo_rebates)
    tcs_cgst        += n(row.tcs_cgst)
    tcs_sgst        += n(row.tcs_sgst)
    tcs_igst        += n(row.tcs_igst)
    tds             += n(row.tds)
    fba_fees        += n(row.fba_fees)
    selling_fees    += n(row.selling_fees)
    other_fees      += n(row.other_fees)
  }

  const tcs_total = tcs_cgst + tcs_sgst + tcs_igst
  const tds_total = tds

  // Income = gross product sales + shipping credits
  // Promo rebates are negative (Amazon deducts them)
  const total_income = total_sales + shipping_credits + promo_rebates

  // Fees (all negative in settlement, store as positive for display)
  const total_fees = Math.abs(fba_fees) + Math.abs(selling_fees) + Math.abs(other_fees)

  // Gross profit = income - fees - tax
  const gross_profit = total_income - total_fees - tcs_total - tds_total

  // COGS
  const has_cogs = !!(product?.cogs && product.cogs > 0)
  const cogs_per_unit = product?.cogs ?? 0
  const cogs_total = cogs_per_unit * units

  // Net profit
  const net_profit = gross_profit - cogs_total - ppcSpend

  // Margin
  const net_margin = total_sales > 0 ? net_profit / total_sales : 0

  return {
    total_sales,
    total_income,
    total_fees,
    gross_profit,
    cogs_total,
    net_profit,
    net_margin,
    tcs_total,
    tds_total,
    has_cogs,
  }
}

export function computeACoS(ppcSpend: number, ppcSales: number): number {
  if (ppcSales === 0) return 0
  return ppcSpend / ppcSales
}

export function computeTACOs(ppcSpend: number, totalSales: number): number {
  if (totalSales === 0) return 0
  return ppcSpend / totalSales
}

export function computeROAS(ppcSales: number, ppcSpend: number): number {
  if (ppcSpend === 0) return 0
  return ppcSales / ppcSpend
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
