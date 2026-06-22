## Task 4: Advertising Campaign CSV Parser

**Files:**
- Create: `lib/parsers/advertising-campaign.ts`
- Create: `lib/parsers/__tests__/advertising-campaign.test.ts`

**Interfaces:**
- Consumes: `ParsedPPC` from `lib/parsers/ppc.ts` (same interface, no changes)
- Produces: `parseAdvertisingCampaign(csvText: string): ParseResult<ParsedPPC>`

**Context:** Input is the Campaign Manager CSV from Seller Central. Headers include `Campaign name`, `Campaign start date`, `Campaign end date`, `Clicks`, `Total cost`, `Sales`, `Purchases`, `ROAS`, `CTR`, `CPC`. No impressions column at campaign level. No ad_group, sku, asin. Values use ₹ formatting and comma thousands separators.

Date format: `MM/DD/YYYY` (e.g. `02/03/2026`).

- [ ] **Step 1: Write tests**

```typescript
// app/lib/parsers/__tests__/advertising-campaign.test.ts
import { describe, it, expect } from 'vitest'
import { parseAdvertisingCampaign } from '../advertising-campaign'

const HEADER = 'State,Campaign name,Status,Type,Targeting,Campaign start date,Campaign end date,Campaign budget amount (converted),Campaign budget amount,Top-of-search impression share,Top-of-search bid adjustment,Clicks,CTR,Total cost (converted),Total cost,CPC (converted),CPC,Purchases,Sales (converted),Sales,ROAS'

function row(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    'State': 'ENABLED',
    'Campaign name': 'Test Campaign',
    'Campaign start date': '02/03/2026',
    'Campaign end date': '',
    'Clicks': '100',
    'CTR': '0.0069',
    'Total cost (converted)': '₹1,000.00',
    'Total cost': '₹1,000.00',
    'CPC (converted)': '₹10.00',
    'CPC': '₹10.00',
    'Purchases': '10',
    'Sales (converted)': '₹5,000.00',
    'Sales': '₹5,000.00',
    'ROAS': '5.0',
  }
  const merged = { ...defaults, ...overrides }
  return HEADER.split(',').map(h => merged[h] ?? '').join(',')
}

describe('parseAdvertisingCampaign', () => {
  it('parses a standard campaign row', () => {
    const csv = [HEADER, row()].join('\n')
    const result = parseAdvertisingCampaign(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].campaign_name).toBe('Test Campaign')
    expect(result.rows[0].clicks).toBe(100)
    expect(result.rows[0].spend).toBe(1000)
    expect(result.rows[0].sales).toBe(5000)
    expect(result.rows[0].orders).toBe(10)
    expect(result.rows[0].roas).toBe(5)
    expect(result.rows[0].ad_group).toBeNull()
  })

  it('computes acos from spend / sales', () => {
    const csv = [HEADER, row()].join('\n')
    const result = parseAdvertisingCampaign(csv)
    expect(result.rows[0].acos).toBeCloseTo(0.2, 5) // 1000/5000
  })

  it('skips rows with zero spend and zero sales', () => {
    const csv = [HEADER, row({ 'Total cost': '₹0.00', 'Sales': '₹0.00' })].join('\n')
    const result = parseAdvertisingCampaign(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it('handles missing end date — uses start date', () => {
    const csv = [HEADER, row({ 'Campaign end date': '' })].join('\n')
    const result = parseAdvertisingCampaign(csv)
    expect(result.rows[0].end_date).toBe(result.rows[0].start_date)
  })

  it('returns empty for header-only CSV', () => {
    const result = parseAdvertisingCampaign(HEADER)
    expect(result.rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — confirm fail**

```bash
cd app && npm test
```
Expected: 5 new tests fail with `Cannot find module '../advertising-campaign'`.

- [ ] **Step 3: Create `lib/parsers/advertising-campaign.ts`**

```typescript
// app/lib/parsers/advertising-campaign.ts
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
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd app && npm test
```
Expected: all 10 tests (5 from Task 3, 5 new) pass.

- [ ] **Step 5: Commit**

```bash
cd app && git add lib/parsers/advertising-campaign.ts lib/parsers/__tests__/advertising-campaign.test.ts && git commit -m "feat(parser): advertising campaign CSV parser"
```

---

