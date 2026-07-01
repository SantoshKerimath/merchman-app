import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseSpTargetingBuffer } from '@/lib/parsers/sp-targeting'
import { aggregateByCampaign, classifyPlacement, normalizeRate } from '@/lib/adanalytics'
import type { RawRow } from '@/lib/adanalytics'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const { rows, skipped } = parseSpTargetingBuffer(buffer)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No targeting rows parsed', skipped }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Delete existing rows for this brand + date range, then re-insert (idempotent)
  const dates = rows.map((r) => r.start_date)
  const minDate = dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))

  await serviceClient
    .from('ppc_targeting')
    .delete()
    .eq('brand_id', brandId)
    .gte('start_date', minDate)
    .lte('start_date', maxDate)

  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({ ...r, brand_id: brandId }))
    const { error } = await serviceClient.from('ppc_targeting').insert(batch)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted += batch.length
  }

  return NextResponse.json({ inserted, skipped })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') ?? 'campaigns'
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('ppc_targeting')
    .select('campaign_name, ad_group, targeting, match_type, impressions, clicks, spend, sales, acos, roas, orders, units, ctr, cpc, cvr')
    .eq('brand_id', brandId)
    .gt('spend', 0)

  if (from) query = query.gte('start_date', from)
  if (to)   query = query.lte('start_date', to)

  const { data, error } = await query.order('spend', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json([])

  // Cast to RawRow (Supabase returns loose types)
  const rows = data as RawRow[]

  if (view === 'campaigns') {
    return NextResponse.json(aggregateByCampaign(rows))
  }

  // targeting view: return raw rows with normalized rates + placement
  const targeting = rows.map((r) => ({
    ...r,
    acos:      normalizeRate(r.acos),
    roas:      r.roas ?? (r.spend && r.sales ? r.sales / r.spend : null),
    ctr:       normalizeRate(r.ctr),
    cvr:       normalizeRate(r.cvr),
    placement: classifyPlacement(r.targeting, r.match_type),
  }))

  return NextResponse.json(targeting)
}
