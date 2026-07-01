// lib/adanalytics.ts

export type PlacementType = 'Keyword' | 'Product' | 'Category' | 'Auto'

export interface RawRow {
  campaign_name: string | null
  ad_group: string | null
  targeting: string | null
  match_type: string | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  spend: number | null
  sales: number | null
  acos: number | null
  roas: number | null
  orders: number | null
  units: number | null
  cvr: number | null
}

export interface CampaignRow {
  campaign_name: string
  impressions: number
  clicks: number
  ctr: number      // ratio 0–1 (clicks/impressions)
  cpc: number      // spend/clicks
  spend: number
  sales: number
  acos: number | null  // ratio 0–1 (spend/sales)
  roas: number | null  // sales/spend
  orders: number
  units: number
  cvr: number      // ratio 0–1 (orders/clicks)
}

export interface TargetingViewRow extends Required<RawRow> {
  placement: PlacementType
}

export function classifyPlacement(
  targeting: string | null,
  matchType: string | null
): PlacementType {
  if (!targeting) return 'Keyword'
  if (targeting.startsWith('asin:')) return 'Product'
  if (targeting.startsWith('category:')) return 'Category'
  if (matchType === 'Auto') return 'Auto'
  return 'Keyword'
}

export function aggregateByCampaign(rows: RawRow[]): CampaignRow[] {
  const map = new Map<string, {
    impressions: number; clicks: number; spend: number
    sales: number; orders: number; units: number
  }>()

  for (const r of rows) {
    const key = r.campaign_name ?? '(Unknown)'
    const acc = map.get(key) ?? { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 }
    acc.impressions += r.impressions ?? 0
    acc.clicks     += r.clicks ?? 0
    acc.spend      += r.spend ?? 0
    acc.sales      += r.sales ?? 0
    acc.orders     += r.orders ?? 0
    acc.units      += r.units ?? 0
    map.set(key, acc)
  }

  return Array.from(map.entries())
    .map(([campaign_name, acc]) => ({
      campaign_name,
      ...acc,
      ctr:  acc.impressions > 0 ? acc.clicks / acc.impressions : 0,
      cpc:  acc.clicks > 0 ? acc.spend / acc.clicks : 0,
      acos: acc.sales > 0 ? acc.spend / acc.sales : null,
      roas: acc.sales > 0 && acc.spend > 0 ? acc.sales / acc.spend : null,
      cvr:  acc.clicks > 0 ? acc.orders / acc.clicks : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
}

/** Normalise ACOS/CTR/CVR from Amazon's report to 0–1 ratio.
 *  Amazon SP Targeting reports store rates as percentages (e.g. 5.5 for 5.5%)
 *  after the parser strips the "%" character. Always divide by 100 to get a 0–1 ratio. */
export function normalizeRate(v: number | null): number | null {
  if (v === null) return null
  // Amazon SP Targeting reports store rates as percentages (e.g. 5.5 for 5.5%)
  // after the parser strips the "%" character. Always divide by 100 to get a 0–1 ratio.
  return v / 100
}
