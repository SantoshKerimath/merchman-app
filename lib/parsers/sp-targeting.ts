/**
 * SP Targeting Report Parser
 * Source: Amazon Advertising Console → Reports → Sponsored Products → Targeting
 *         or SP-API: GET_SPONSORED_PRODUCTS_TARGETING_REPORT
 *
 * Expected columns (named headers, row 0 = headers, row 1+ = data):
 *   Start Date, End Date, Campaign Name, Ad Group Name, Targeting, Match Type,
 *   Impressions, Clicks, CTR, CPC, Spend, 14 Day Total Sales (#),
 *   ACOS, ROAS, 14 Day Total Orders (#), 14 Day Total Units (#), CVR
 *
 * The parser is header-name based (not index-based) so it handles column reordering.
 */

import * as XLSX from 'xlsx'

export interface ParsedTargeting {
  start_date: string
  end_date: string
  campaign_name: string | null
  ad_group: string | null
  targeting: string | null
  match_type: string | null
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateStr(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  }
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().split('T')[0]
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  }
  return null
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[%,₹\s]/g, ''))
  return isNaN(n) ? null : n
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v).trim() || null
}

/** Normalise header: lowercase, strip spaces/special chars */
function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Maps normalised header → ParsedTargeting field
const HEADER_MAP: Record<string, keyof ParsedTargeting> = {
  startdate: 'start_date',
  enddate: 'end_date',
  campaignname: 'campaign_name',
  adgroupname: 'ad_group',
  targeting: 'targeting',
  matchtype: 'match_type',
  impressions: 'impressions',
  clicks: 'clicks',
  ctr: 'ctr',
  cpc: 'cpc',
  spend: 'spend',
  '14daytotalsales': 'sales',
  acos: 'acos',
  roas: 'roas',
  '14daytotalorders': 'orders',
  '14daytotalunits': 'units',
  cvr: 'cvr',
}

// ── Main export ────────────────────────────────────────────────────────────────

export function parseSpTargetingBuffer(
  buffer: Buffer
): { rows: ParsedTargeting[]; skipped: number } {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  // Try sheet named "SP Targeting" first, else first sheet
  const sheetName =
    wb.SheetNames.find((n) => /targeting/i.test(n)) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return { rows: [], skipped: 0 }

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (raw.length < 2) return { rows: [], skipped: 0 }

  // Build column index map from header row
  const headerRow = raw[0] as unknown[]
  const colMap: Record<keyof ParsedTargeting, number | null> = {} as Record<
    keyof ParsedTargeting,
    number | null
  >
  headerRow.forEach((h, i) => {
    const field = HEADER_MAP[norm(h)]
    if (field) colMap[field] = i
  })

  const rows: ParsedTargeting[] = []
  let skipped = 0

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[]
    if (!r || r.every((c) => c === null || c === '')) { skipped++; continue }

    const get = (field: keyof ParsedTargeting) => {
      const idx = colMap[field]
      return idx != null ? r[idx] : null
    }

    const start_date = toDateStr(get('start_date'))
    const end_date = toDateStr(get('end_date'))
    if (!start_date || !end_date) { skipped++; continue }

    const spend = toNum(get('spend'))
    if (spend === null || spend === 0) { skipped++; continue }

    rows.push({
      start_date,
      end_date,
      campaign_name: toStr(get('campaign_name')),
      ad_group: toStr(get('ad_group')),
      targeting: toStr(get('targeting')),
      match_type: toStr(get('match_type')),
      impressions: toNum(get('impressions')),
      clicks: toNum(get('clicks')),
      ctr: toNum(get('ctr')),
      cpc: toNum(get('cpc')),
      spend,
      sales: toNum(get('sales')),
      acos: toNum(get('acos')),
      roas: toNum(get('roas')),
      orders: toNum(get('orders')),
      units: toNum(get('units')),
      cvr: toNum(get('cvr')),
    })
  }

  return { rows, skipped }
}
