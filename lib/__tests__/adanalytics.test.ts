import { describe, it, expect } from 'vitest'
import { classifyPlacement, aggregateByCampaign } from '../adanalytics'

describe('classifyPlacement', () => {
  it('classifies asin: prefix as Product', () => {
    expect(classifyPlacement('asin:B001234567', null)).toBe('Product')
  })
  it('classifies category: prefix as Category', () => {
    expect(classifyPlacement('category:12345', null)).toBe('Category')
  })
  it('classifies Auto match type as Auto', () => {
    expect(classifyPlacement('women shoes', 'Auto')).toBe('Auto')
  })
  it('defaults to Keyword', () => {
    expect(classifyPlacement('women shoes', 'Exact')).toBe('Keyword')
  })
  it('handles null targeting as Keyword', () => {
    expect(classifyPlacement(null, 'Exact')).toBe('Keyword')
  })
})

describe('aggregateByCampaign', () => {
  const makeRow = (campaign: string, overrides: Partial<{impressions:number,clicks:number,spend:number,sales:number,orders:number,units:number}> = {}) => ({
    campaign_name: campaign, ad_group: null, targeting: null, match_type: null,
    ctr: null, cpc: null, acos: null, roas: null, cvr: null,
    impressions: 1000, clicks: 50, spend: 500, sales: 2000, orders: 10, units: 12,
    ...overrides,
  })

  it('sums metrics by campaign', () => {
    const rows = [makeRow('Camp A', { spend: 500, sales: 2000 }), makeRow('Camp A', { spend: 250, sales: 1000 })]
    const result = aggregateByCampaign(rows)
    expect(result).toHaveLength(1)
    expect(result[0].spend).toBe(750)
    expect(result[0].sales).toBe(3000)
  })

  it('derives ACOS as ratio', () => {
    const rows = [makeRow('B', { spend: 200, sales: 1000, clicks: 100, impressions: 1000, orders: 20 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].acos).toBeCloseTo(0.2)
    expect(result[0].roas).toBe(5)
    expect(result[0].ctr).toBeCloseTo(0.1)
    expect(result[0].cvr).toBeCloseTo(0.2)
    expect(result[0].cpc).toBe(2)
  })

  it('returns null acos/roas when sales/spend is 0', () => {
    const rows = [makeRow('C', { spend: 100, sales: 0, orders: 0 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].acos).toBeNull()
    expect(result[0].roas).toBeNull()
  })

  it('returns null roas when spend is 0', () => {
    const rows = [makeRow('D', { spend: 0, sales: 500, orders: 5 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].roas).toBeNull()
  })

  it('sorts by spend descending', () => {
    const rows = [makeRow('A', { spend: 100 }), makeRow('B', { spend: 300 })]
    const result = aggregateByCampaign(rows)
    expect(result[0].campaign_name).toBe('B')
    expect(result[1].campaign_name).toBe('A')
  })
})
