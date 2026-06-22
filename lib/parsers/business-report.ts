import type { ParseResult } from './settlement-v2'

export interface ParsedBusinessMetric {
  date: string
  ordered_sales: number | null
  units_ordered: number | null
  sessions: number | null
  conversion_rate: number | null
  avg_selling_price: number | null
}

function toNum(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace(/[₹,"'\s]/g, '').replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function toPct(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace('%', '').trim())
  return isNaN(n) ? null : n / 100
}

function parseDDMMYY(v: string): string | null {
  if (!v || v.trim() === '') return null
  // DD/MM/YY
  const parts = v.trim().split('/')
  if (parts.length === 3) {
    const [dd, mm, yy] = parts
    const year = parseInt(yy) < 100 ? 2000 + parseInt(yy) : parseInt(yy)
    const d = new Date(Date.UTC(year, parseInt(mm) - 1, parseInt(dd)))
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  // Fallback: try native parse
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

export function parseBusinessReport(csvText: string): ParseResult<ParsedBusinessMetric> {
  const lines = csvText.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return { rows: [], skipped: 0, errors: [] }

  const headers = lines[0].split(',')
  const idx = (name: string) => headers.indexOf(name)

  const rows: ParsedBusinessMetric[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values
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

    const date = parseDDMMYY(get('Date'))
    if (!date) { skipped++; continue }

    try {
      rows.push({
        date,
        ordered_sales: toNum(get('Ordered Product Sales')),
        units_ordered: toNum(get('Units Ordered')) !== null
          ? Math.round(toNum(get('Units Ordered'))!) : null,
        sessions: toNum(get('Sessions - Total')) !== null
          ? Math.round(toNum(get('Sessions - Total'))!) : null,
        conversion_rate: toPct(get('Order Item Session Percentage')),
        avg_selling_price: toNum(get('Average Selling Price')),
      })
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e}`)
    }
  }

  return { rows, skipped, errors }
}
