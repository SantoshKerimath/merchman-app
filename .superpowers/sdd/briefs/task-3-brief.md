## Task 3: Settlement Flat File V2 Parser

**Files:**
- Create: `lib/parsers/settlement-v2.ts`
- Modify: `lib/parsers/__tests__/settlement-v2.test.ts`

**Interfaces:**
- Consumes: `ParsedSettlement` from `lib/parsers/settlement.ts` (same interface, no changes)
- Produces: `parseSettlementV2(tsvText: string): ParseResult<ParsedSettlement>`

**Context:** Flat File V2 is TSV with named headers. Unlike the XLSX parser (one row per transaction), V2 has one row per *amount component* — multiple rows share the same `order-id`. Must group by `(order-id, sku, posted-date)` and pivot `amount-type`/`amount-description`/`amount` columns into `ParsedSettlement` fields.

V2 TSV headers (tab-separated, first line):
```
settlement-id	settlement-start-date	settlement-end-date	deposit-date	total-amount	currency	transaction-type	order-id	merchant-order-id	adjustment-id	shipment-id	marketplace-name	amount-type	amount-description	amount	fulfillment-id	posted-date	merchant-order-item-id	merchant-adjustment-item-id	sku	quantity-purchased	promotion-id
```

Amount type mapping to `ParsedSettlement`:
- `amount-type = 'ItemPrice'` + `amount-description = 'Principal'` → `product_sales`
- `amount-type = 'ItemPrice'` + `amount-description = 'Shipping'` → `shipping_credits`
- `amount-type = 'Promotion'` → `promo_rebates` (any description)
- `amount-type = 'FBAWeightBasedFee'` or `'FBAPerUnitFulfillmentFee'` or `'FBAPerOrderFulfillmentFee'` → `fba_fees`
- `amount-type = 'Commission'` → `selling_fees`
- `amount-type = 'Tax'` + `amount-description = 'TCS-CGST'` → `tcs_cgst`
- `amount-type = 'Tax'` + `amount-description = 'TCS-SGST'` → `tcs_sgst`
- `amount-type = 'Tax'` + `amount-description = 'TCS-IGST'` → `tcs_igst`
- `amount-type = 'Tax'` + `amount-description` contains `'TDS'` → `tds`
- Sum of all amounts for the order group → `total`

- [ ] **Step 1: Write tests first**

Replace `lib/parsers/__tests__/settlement-v2.test.ts`:

```typescript
// app/lib/parsers/__tests__/settlement-v2.test.ts
import { describe, it, expect } from 'vitest'
import { parseSettlementV2 } from '../settlement-v2'

const HEADER = [
  'settlement-id', 'settlement-start-date', 'settlement-end-date', 'deposit-date',
  'total-amount', 'currency', 'transaction-type', 'order-id', 'merchant-order-id',
  'adjustment-id', 'shipment-id', 'marketplace-name', 'amount-type', 'amount-description',
  'amount', 'fulfillment-id', 'posted-date', 'merchant-order-item-id',
  'merchant-adjustment-item-id', 'sku', 'quantity-purchased', 'promotion-id',
].join('\t')

function row(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    'settlement-id': '100001',
    'transaction-type': 'Order',
    'order-id': 'ORDER-001',
    'amount-type': 'ItemPrice',
    'amount-description': 'Principal',
    'amount': '1000.00',
    'posted-date': '2026-04-01',
    'sku': 'SKU-A',
    'quantity-purchased': '2',
  }
  const merged = { ...defaults, ...overrides }
  return HEADER.split('\t').map(h => merged[h] ?? '').join('\t')
}

describe('parseSettlementV2', () => {
  it('parses a single order with one ItemPrice Principal row', () => {
    const tsv = [HEADER, row()].join('\n')
    const result = parseSettlementV2(tsv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].order_id).toBe('ORDER-001')
    expect(result.rows[0].sku).toBe('SKU-A')
    expect(result.rows[0].product_sales).toBe(1000)
    expect(result.rows[0].quantity).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('aggregates multiple amount-type rows for the same order', () => {
    const tsv = [
      HEADER,
      row({ 'amount-type': 'ItemPrice', 'amount-description': 'Principal', 'amount': '999.00' }),
      row({ 'amount-type': 'Commission', 'amount-description': 'ReferralFee', 'amount': '-149.85' }),
      row({ 'amount-type': 'FBAPerUnitFulfillmentFee', 'amount-description': 'FBAPerUnitFulfillmentFee', 'amount': '-50.00' }),
    ].join('\n')
    const result = parseSettlementV2(tsv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].product_sales).toBe(999)
    expect(result.rows[0].selling_fees).toBe(-149.85)
    expect(result.rows[0].fba_fees).toBe(-50)
  })

  it('maps TCS tax rows correctly', () => {
    const tsv = [
      HEADER,
      row({ 'amount-type': 'ItemPrice', 'amount-description': 'Principal', 'amount': '500.00' }),
      row({ 'amount-type': 'Tax', 'amount-description': 'TCS-CGST', 'amount': '-4.50' }),
      row({ 'amount-type': 'Tax', 'amount-description': 'TCS-IGST', 'amount': '-9.00' }),
    ].join('\n')
    const result = parseSettlementV2(tsv)
    expect(result.rows[0].tcs_cgst).toBe(-4.5)
    expect(result.rows[0].tcs_igst).toBe(-9)
    expect(result.rows[0].tcs_sgst).toBe(null)
  })

  it('skips rows with no order-id and no amount', () => {
    const tsv = [
      HEADER,
      row({ 'order-id': '', 'amount': '' }),
    ].join('\n')
    const result = parseSettlementV2(tsv)
    expect(result.rows).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it('returns empty result for TSV with only header', () => {
    const result = parseSettlementV2(HEADER)
    expect(result.rows).toHaveLength(0)
    expect(result.skipped).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — confirm all fail**

```bash
cd app && npm test
```
Expected: 5 tests fail with `Cannot find module '../settlement-v2'`.

- [ ] **Step 3: Create `lib/parsers/settlement-v2.ts`**

```typescript
// app/lib/parsers/settlement-v2.ts
import type { ParsedSettlement } from './settlement'

export interface ParseResult<T> {
  rows: T[]
  skipped: number
  errors: string[]
}

type V2Row = Record<string, string>

function toNum(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace(/[₹,\s]/g, ''))
  return isNaN(n) ? null : n
}

function groupKey(r: V2Row): string {
  return `${r['settlement-id']}|${r['order-id'] || r['adjustment-id']}|${r['sku']}|${r['posted-date']}`
}

function mapAmountToField(
  row: V2Row,
  acc: Partial<ParsedSettlement>
): void {
  const type = row['amount-type'] ?? ''
  const desc = row['amount-description'] ?? ''
  const amount = toNum(row['amount'])
  if (amount === null) return

  const add = (field: keyof ParsedSettlement) => {
    const cur = (acc[field] as number | null) ?? 0
    ;(acc as Record<string, number>)[field as string] = cur + amount
  }

  if (type === 'ItemPrice' && desc === 'Principal') return add('product_sales')
  if (type === 'ItemPrice' && desc === 'Shipping') return add('shipping_credits')
  if (type === 'Promotion') return add('promo_rebates')
  if (['FBAWeightBasedFee', 'FBAPerUnitFulfillmentFee', 'FBAPerOrderFulfillmentFee',
       'FBARemovalFee', 'FBADisposalFee'].includes(type)) return add('fba_fees')
  if (type === 'Commission') return add('selling_fees')
  if (type === 'Tax' && desc === 'TCS-CGST') return add('tcs_cgst')
  if (type === 'Tax' && desc === 'TCS-SGST') return add('tcs_sgst')
  if (type === 'Tax' && desc === 'TCS-IGST') return add('tcs_igst')
  if (type === 'Tax' && desc.toUpperCase().includes('TDS')) return add('tds')
  // For total: accumulate all amounts
  add('total')
}

export function parseSettlementV2(tsvText: string): ParseResult<ParsedSettlement> {
  const lines = tsvText.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return { rows: [], skipped: 0, errors: [] }

  const headers = lines[0].split('\t')
  const dataLines = lines.slice(1)

  // Parse each line into a Record<header, value>
  const rawRows: V2Row[] = dataLines.map(line => {
    const values = line.split('\t')
    const obj: V2Row = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })

  // Group by key
  const groups = new Map<string, { meta: V2Row; components: V2Row[] }>()
  let skipped = 0

  for (const r of rawRows) {
    const orderId = r['order-id'] || r['adjustment-id']
    const amount = r['amount']
    if (!orderId && !amount) { skipped++; continue }

    const key = groupKey(r)
    if (!groups.has(key)) {
      groups.set(key, { meta: r, components: [] })
    }
    groups.get(key)!.components.push(r)
  }

  const rows: ParsedSettlement[] = []
  const errors: string[] = []

  for (const [, { meta, components }] of groups) {
    try {
      const acc: Partial<ParsedSettlement> = {}
      acc.total = 0

      for (const c of components) {
        mapAmountToField(c, acc)
      }

      const postedDate = meta['posted-date']
      if (!postedDate) { skipped++; continue }

      rows.push({
        transaction_date: new Date(postedDate).toISOString(),
        settlement_id: meta['settlement-id'] ? Number(meta['settlement-id']) : null,
        type: meta['transaction-type'] || null,
        order_id: meta['order-id'] || null,
        sku: meta['sku'] || null,
        quantity: meta['quantity-purchased'] ? Number(meta['quantity-purchased']) : null,
        fulfillment: meta['fulfillment-id'] || null,
        city: null,
        state: null,
        product_sales: acc.product_sales ?? null,
        shipping_credits: acc.shipping_credits ?? null,
        promo_rebates: acc.promo_rebates ?? null,
        tcs_cgst: acc.tcs_cgst ?? null,
        tcs_sgst: acc.tcs_sgst ?? null,
        tcs_igst: acc.tcs_igst ?? null,
        tds: acc.tds ?? null,
        selling_fees: acc.selling_fees ?? null,
        fba_fees: acc.fba_fees ?? null,
        other_fees: null,
        total: acc.total ?? null,
      })
    } catch (e) {
      errors.push(`Order ${meta['order-id']}: ${e}`)
    }
  }

  return { rows, skipped, errors }
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
cd app && npm test
```
Expected: 5 passed, 0 failed.

- [ ] **Step 5: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd app && git add lib/parsers/settlement-v2.ts lib/parsers/__tests__/settlement-v2.test.ts && git commit -m "feat(parser): settlement Flat File V2 TSV parser with grouped amount-type pivoting"
```

---

