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
  acc: Partial<ParsedSettlement>,
): void {
  const type = row['amount-type'] ?? ''
  const desc = row['amount-description'] ?? ''
  const amount = toNum(row['amount'])
  if (amount === null) return

  const add = (field: keyof ParsedSettlement) => {
    const cur = (acc[field] as number | null) ?? 0
    ;(acc as Record<string, number>)[field as string] = cur + amount
  }

  // Always accumulate into total
  add('total')

  if (type === 'ItemPrice' && desc === 'Principal') return add('product_sales')
  if (type === 'ItemPrice' && desc === 'Shipping') return add('shipping_credits')
  if (type === 'Promotion') return add('promo_rebates')
  if (
    [
      'FBAWeightBasedFee',
      'FBAPerUnitFulfillmentFee',
      'FBAPerOrderFulfillmentFee',
      'FBARemovalFee',
      'FBADisposalFee',
    ].includes(type)
  )
    return add('fba_fees')
  if (type === 'Commission') return add('selling_fees')
  if (type === 'Tax' && desc === 'TCS-CGST') return add('tcs_cgst')
  if (type === 'Tax' && desc === 'TCS-SGST') return add('tcs_sgst')
  if (type === 'Tax' && desc === 'TCS-IGST') return add('tcs_igst')
  if (type === 'Tax' && desc.toUpperCase().includes('TDS')) return add('tds')
}

export function parseSettlementV2(tsvText: string): ParseResult<ParsedSettlement> {
  const lines = tsvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(Boolean)
  if (lines.length < 2) return { rows: [], skipped: 0, errors: [] }

  const headers = lines[0].split('\t')
  const dataLines = lines.slice(1)

  // Parse each line into a Record<header, value>
  const rawRows: V2Row[] = dataLines.map((line) => {
    const values = line.split('\t')
    const obj: V2Row = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ''
    })
    return obj
  })

  // Group by key
  const groups = new Map<string, { meta: V2Row; components: V2Row[] }>()
  let skipped = 0

  for (const r of rawRows) {
    const orderId = r['order-id'] || r['adjustment-id']
    const amount = r['amount']
    if (!orderId && !amount) {
      skipped++
      continue
    }

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
      if (!postedDate) {
        skipped++
        continue
      }

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
