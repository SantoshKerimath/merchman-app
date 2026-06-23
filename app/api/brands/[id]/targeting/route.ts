import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseSpTargetingBuffer } from '@/lib/parsers/sp-targeting'

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  // Top 20 keywords by spend
  const { data: topSpend } = await serviceClient
    .from('ppc_targeting')
    .select('targeting, match_type, impressions, clicks, spend, sales, acos, roas, orders, cvr')
    .eq('brand_id', brandId)
    .not('targeting', 'is', null)
    .order('spend', { ascending: false })
    .limit(20)

  // High spend, zero conversion (negative targeting candidates)
  const { data: wasted } = await serviceClient
    .from('ppc_targeting')
    .select('targeting, match_type, spend, clicks, orders')
    .eq('brand_id', brandId)
    .not('targeting', 'is', null)
    .gt('spend', 0)
    .eq('orders', 0)
    .order('spend', { ascending: false })
    .limit(20)

  // Top converters (lowest ACOS, min 1 order)
  const { data: topConverters } = await serviceClient
    .from('ppc_targeting')
    .select('targeting, match_type, spend, sales, acos, roas, orders, cvr')
    .eq('brand_id', brandId)
    .not('targeting', 'is', null)
    .gt('orders', 0)
    .not('acos', 'is', null)
    .order('acos', { ascending: true })
    .limit(20)

  return NextResponse.json({ topSpend, wasted, topConverters })
}
