/**
 * Settlement Parser
 * Parses Amazon settlement data from XLSX (Growz Scalers format)
 * Column order matches the Sales Database sheet exactly.
 *
 * Columns (0-indexed):
 *  0  date/time
 *  1  settlement id
 *  2  type
 *  3  order id
 *  4  Sku
 *  5  description
 *  6  quantity
 *  7  marketplace
 *  8  account type
 *  9  fulfillment
 *  10 order city
 *  11 order state
 *  12 order postal
 *  13 product sales
 *  14 shipping credits
 *  15 gift wrap credits
 *  16 promotional rebates
 *  17 Total sales tax liable (GST)
 *  18 TCS-CGST
 *  19 TCS-SGST
 *  20 TCS-IGST
 *  21 TDS (Section 194-O)
 *  22 selling fees
 *  23 fba fees
 *  24 other transaction fees
 *  25 other
 *  26 total
 */

export interface ParsedSettlement {
  transaction_date: string
  settlement_id: number | null
  type: string | null
  order_id: string | null
  sku: string | null
  quantity: number | null
  fulfillment: string | null
  city: string | null
  state: string | null
  product_sales: number | null
  shipping_credits: number | null
  promo_rebates: number | null
  tcs_cgst: number | null
  tcs_sgst: number | null
  tcs_igst: number | null
  tds: number | null
  selling_fees: number | null
  fba_fees: number | null
  other_fees: number | null
  total: number | null
}

export interface ParseResult {
  rows: ParsedSettlement[]
  skipped: number
  errors: string[]
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[₹,\s]/g, ''))
  return isNaN(n) ? null : n
}

function toDate(v: unknown): string | null {
  if (!v) return null
  // Excel serial number
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    return d.toISOString()
  }
  // String like "31 May 2025 6:39:49 pm UTC"
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  // Date object
  if (v instanceof Date) return v.toISOString()
  return null
}

export function parseSettlementRows(rawRows: unknown[][]): ParseResult {
  const rows: ParsedSettlement[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i]
    if (!r || !r[0]) { skipped++; continue }

    const date = toDate(r[0])
    if (!date) { skipped++; continue }

    // Skip rows that are not order/refund types
    const type = r[2] ? String(r[2]) : null

    try {
      rows.push({
        transaction_date: date,
        settlement_id: r[1] ? Number(r[1]) : null,
        type,
        order_id: r[3] ? String(r[3]) : null,
        sku: r[4] ? String(r[4]).trim() : null,
        quantity: toNum(r[6]),
        fulfillment: r[9] ? String(r[9]) : null,
        city: r[10] ? String(r[10]) : null,
        state: r[11] ? String(r[11]) : null,
        product_sales: toNum(r[13]),
        shipping_credits: toNum(r[14]),
        promo_rebates: toNum(r[16]),
        tcs_cgst: toNum(r[18]),
        tcs_sgst: toNum(r[19]),
        tcs_igst: toNum(r[20]),
        tds: toNum(r[21]),
        selling_fees: toNum(r[22]),
        fba_fees: toNum(r[23]),
        other_fees: toNum(r[24]),
        total: toNum(r[26]),
      })
    } catch (e) {
      errors.push(`Row ${i + 3}: ${e}`)
    }
  }

  return { rows, skipped, errors }
}
