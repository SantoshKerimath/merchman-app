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
  return HEADER.split(',').map(h => {
    const v = merged[h] ?? ''
    return v.includes(',') ? `"${v}"` : v
  }).join(',')
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
