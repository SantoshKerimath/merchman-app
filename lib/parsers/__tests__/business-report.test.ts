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
