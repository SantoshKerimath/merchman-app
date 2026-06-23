import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const unresolvedOnly = searchParams.get('unresolved') === 'true'
  const brandId = searchParams.get('brand_id')

  let query = supabase
    .from('alerts')
    .select(`
      id, type, severity, message, metric_value, threshold,
      resolved_at, notified_at, created_at,
      brands!inner(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (unresolvedOnly) query = query.is('resolved_at', null)
  if (brandId) query = query.eq('brand_id', brandId)

  const { data: alerts, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ alerts: alerts ?? [] })
}
