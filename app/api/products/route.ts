import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { brand_id, sku, cogs } = body as { brand_id: string; sku: string; cogs: number }

  if (!brand_id || !sku) {
    return NextResponse.json({ error: 'brand_id and sku required' }, { status: 400 })
  }

  const cogsNum = Number(cogs)
  if (isNaN(cogsNum) || cogsNum < 0 || cogsNum > 99999) {
    return NextResponse.json({ error: 'COGS must be 0–99999' }, { status: 400 })
  }

  // Verify brand belongs to user's agency via RLS
  const { data: brand } = await supabase
    .from('brands')
    .select('id, agency_id')
    .eq('id', brand_id)
    .single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const { data: product, error } = await supabase
    .from('products')
    .upsert(
      { brand_id, sku, cogs: cogsNum, is_active: true, name: sku },
      { onConflict: 'brand_id,sku' }
    )
    .select('id, brand_id, sku, cogs')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ product })
}
