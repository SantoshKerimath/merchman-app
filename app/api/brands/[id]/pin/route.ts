import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch current pin state (RLS ensures only agency's own brands are accessible)
  const { data: brand, error: fetchErr } = await supabase
    .from('brands')
    .select('is_pinned')
    .eq('id', id)
    .single()

  if (fetchErr || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const { error: updateErr } = await supabase
    .from('brands')
    .update({ is_pinned: !brand.is_pinned })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ is_pinned: !brand.is_pinned })
}
