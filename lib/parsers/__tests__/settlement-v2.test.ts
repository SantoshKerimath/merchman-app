import { describe, it, expect } from 'vitest'
import { parseSettlementV2 } from '../settlement-v2'

const HEADER = [
  'settlement-id',
  'settlement-start-date',
  'settlement-end-date',
  'deposit-date',
  'total-amount',
  'currency',
  'transaction-type',
  'order-id',
  'merchant-order-id',
  'adjustment-id',
  'shipment-id',
  'marketplace-name',
  'amount-type',
  'amount-description',
  'amount',
  'fulfillment-id',
  'posted-date',
  'merchant-order-item-id',
  'merchant-adjustment-item-id',
  'sku',
  'quantity-purchased',
  'promotion-id',
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
  return HEADER.split('\t')
    .map((h) => merged[h] ?? '')
    .join('\t')
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
      row({
        'amount-type': 'Commission',
        'amount-description': 'ReferralFee',
        'amount': '-149.85',
      }),
      row({
        'amount-type': 'FBAPerUnitFulfillmentFee',
        'amount-description': 'FBAPerUnitFulfillmentFee',
        'amount': '-50.00',
      }),
    ].join('\n')
    const result = parseSettlementV2(tsv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].product_sales).toBe(999)
    expect(result.rows[0].selling_fees).toBe(-149.85)
    expect(result.rows[0].fba_fees).toBe(-50)
    expect(result.rows[0].total).toBeCloseTo(799.15, 2)
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
    const tsv = [HEADER, row({ 'order-id': '', 'amount': '' })].join('\n')
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
