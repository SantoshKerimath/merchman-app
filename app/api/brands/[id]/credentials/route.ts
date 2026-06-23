import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface SyncSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'custom' | 'on_login'
  days?: number[]
  time: string
  on_login: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    sync_schedule?: SyncSchedule
    alert_config?: Record<string, unknown>
  }
  const { sync_schedule, alert_config } = body

  if (!sync_schedule && alert_config === undefined) {
    return NextResponse.json({ error: 'sync_schedule or alert_config required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (sync_schedule) updates.sync_schedule = sync_schedule
  if (alert_config !== undefined) updates.alert_config = alert_config

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('brand_credentials')
    .update(updates as any)
    .eq('brand_id', brandId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('brand_credentials')
    .delete()
    .eq('brand_id', brandId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
