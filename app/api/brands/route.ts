import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Brand name required' }, { status: 400 })

  const { data: member } = await supabase
    .from('team_members')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      agency_id: member.agency_id,
      name: name.trim(),
      marketplace_id: 'A21TJRUUN4KGV',
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ brand })
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({ brands: brands ?? [] })
}
