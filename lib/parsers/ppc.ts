/**
 * PPC Parser
 * Parses Amazon PPC data from XLSX (Growz Scalers "PPC Database" sheet)
 *
 * Columns (0-indexed, row 0 = title skip, row 1 = headers skip, row 2+ = data):
 *  0  START DATE (Excel serial or Date)
 *  1  END DATE (Excel serial or Date)
 *  2  PORTFOLIO NAME (skip)
 *  3  CURRENCY (skip)
 *  4  CAMPAIGN NAME
 *  5  AD GROUP NAME
 *  6  SKU (product TLA short name)
 *  7  ASIN
 *  8  IMPRESSION
 *  9  CLICKS
 *  10 CTR
 *  11 CPC
 *  12 SPEND
 *  13 SALES
 *  14 ACOS
 *  15 RoAS
 *  16 ORDERS
 *  17 UNITS
 *  18 CVR
 */

export interface ParsedPPC {
  start_date: string
  end_date: string
  campaign_name: string | null
  ad_group: string | null
  sku: string | null
  asin: string | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  spend: number | null
  sales: number | null
  acos: number | null
  roas: number | null
  orders: number | null
  units: number | null
  cvr: number | null
}

function toDateStr(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    return v.toISOString().split('T')[0]
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[₹,\s]/g, ''))
  return isNaN(n) ? null : n
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v).trim()
}

export function parsePPCRows(rawRows: unknown[][]): { rows: ParsedPPC[]; skipped: number } {
  const rows: ParsedPPC[] = []
  let skipped = 0

  for (const r of rawRows) {
    if (!r || !r[0]) { skipped++; continue }

    const start_date = toDateStr(r[0])
    const end_date = toDateStr(r[1])

    if (!start_date || !end_date) { skipped++; continue }

    const spend = toNum(r[12])
    const sales = toNum(r[13])
    if ((spend === null || spend === 0) && (sales === null || sales === 0)) {
      skipped++
      continue
    }

    rows.push({
      start_date,
      end_date,
      campaign_name: toStr(r[4]),
      ad_group: toStr(r[5]),
      sku: toStr(r[6]),
      asin: toStr(r[7]),
      impressions: toNum(r[8]),
      clicks: toNum(r[9]),
      ctr: toNum(r[10]),
      cpc: toNum(r[11]),
      spend,
      sales,
      acos: toNum(r[14]),
      roas: toNum(r[15]),
      orders: toNum(r[16]),
      units: toNum(r[17]),
      cvr: toNum(r[18]),
    })
  }

  return { rows, skipped }
}
