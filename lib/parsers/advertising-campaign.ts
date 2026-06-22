import type { ParsedPPC } from './ppc'
import type { ParseResult } from './settlement-v2'

function toNum(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace(/[₹,%\s]/g, '').replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function toDateStr(v: string | undefined): string | null {
  if (!v || v.trim() === '') return null
  // MM/DD/YYYY
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

export function parseAdvertisingCampaign(csvText: string): ParseResult<ParsedPPC> {
  const lines = csvText.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return { rows: [], skipped: 0, errors: [] }

  const headers = lines[0].split(',')
  const idx = (name: string) => headers.indexOf(name)

  const rows: ParsedPPC[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV values (e.g. "₹14,283.87")
    const values: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { values.push(cur); cur = ''; continue }
      cur += ch
    }
    values.push(cur)

    const get = (name: string) => values[idx(name)] ?? ''

    const spend = toNum(get('Total cost'))
    const sales = toNum(get('Sales'))
    if ((spend === null || spend === 0) && (sales === null || sales === 0)) {
      skipped++
      continue
    }

    const start_date = toDateStr(get('Campaign start date'))
    if (!start_date) { skipped++; continue }
    const end_date = toDateStr(get('Campaign end date')) ?? start_date

    try {
      rows.push({
        start_date,
        end_date,
        campaign_name: get('Campaign name') || null,
        ad_group: null,
        sku: null,
        asin: null,
        impressions: null,
        clicks: toNum(get('Clicks')),
        ctr: toNum(get('CTR')),
        cpc: toNum(get('CPC')),
        spend,
        sales,
        acos: spend !== null && sales !== null && sales > 0 ? spend / sales : null,
        roas: toNum(get('ROAS')),
        orders: toNum(get('Purchases')),
        units: null,
        cvr: null,
      })
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e}`)
    }
  }

  return { rows, skipped, errors }
}
