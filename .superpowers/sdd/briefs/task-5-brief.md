## Task 5: Business Report CSV Parser

**Files:**
- Create: `lib/parsers/business-report.ts`
- Create: `lib/parsers/__tests__/business-report.test.ts`

**Interfaces:**
- Produces: `ParsedBusinessMetric` interface, `parseBusinessReport(csvText: string): ParseResult<ParsedBusinessMetric>`

**Context:** Input CSV headers: `Date`, `Ordered Product Sales`, `Units Ordered`, `Sessions - Total`, `Order Item Session Percentage`, `Average Selling Price`. Date format: `DD/MM/YY` (e.g. `01/02/26`). Currency values use ₹ + commas. Percentage: `2.51%` → store as `0.0251`.

- [ ] **Step 1: Write tests**

```typescript
// app/lib/parsers/__tests__/business-report.test.ts
import { describe, it, expect } from 'vitest'
import { parseBusinessReport } from '../business-report'

const HEADER = 'Date,Ordered Product Sales,Ordered Product Sales - B2B,Units Ordered,Units Ordered - B2B,Total Order Items,Total Order Items - B2B,Average Sales per Order Item,Average Sales per Order Item - B2B,Average Units per Order Item,Average Units per Order Item - B2B,Average Selling Price,Average Selling Price - B2B,Sessions - Total,Sessions - Total - B2B,Order Item Session Percentage,Order Item Session Percentage - B2B,Average Offer Count'

function row(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    'Date': '01/04/26',
    'Ordered Product Sales': '"₹75,565.26"',
    'Units Ordered': '39',
    'Average Selling Price': '"₹1,937.57"',
    'Sessions - Total': '"1,514"',
    'Order Item Session Percentage': '2.51%',
  }
  const merged = { ...defaults, ...overrides }
  return HEADER.split(',').map(h => merged[h] ?? '0').join(',')
}

describe('parseBusinessReport', () => {
  it('parses a standard business report row', () => {
    const csv = [HEADER, row()].join('\n')
    const result = parseBusinessReport(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].date).toBe('2026-04-01')
    expect(result.rows[0].ordered_sales).toBe(75565.26)
    expect(result.rows[0].units_ordered).toBe(39)
    expect(result.rows[0].sessions).toBe(1514)
    expect(result.rows[0].conversion_rate).toBeCloseTo(0.0251, 4)
    expect(result.rows[0].avg_selling_price).toBe(1937.57)
  })

  it('parses DD/MM/YY date format correctly', () => {
    const csv = [HEADER, row({ 'Date': '15/06/26' })].join('\n')
    const result = parseBusinessReport(csv)
    expect(result.rows[0].date).toBe('2026-06-15')
  })

  it('skips rows with no date', () => {
    const csv = [HEADER, row({ 'Date': '' })].join('\n')
    const result = parseBusinessReport(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it('returns empty for header-only CSV', () => {
    const result = parseBusinessReport(HEADER)
    expect(result.rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — confirm fail**

```bash
cd app && npm test
```
Expected: 4 new tests fail.

- [ ] **Step 3: Create `lib/parsers/business-report.ts`**

```typescript
// app/lib/parsers/business-report.ts
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
    const d = new Date(year, parseInt(mm) - 1, parseInt(dd))
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
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
cd app && npm test
```
Expected: all 14 tests pass (5 + 5 + 4).

- [ ] **Step 5: Commit**

```bash
cd app && git add lib/parsers/business-report.ts lib/parsers/__tests__/business-report.test.ts && git commit -m "feat(parser): business report CSV parser with DD/MM/YY date handling"
```

---

