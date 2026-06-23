import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // First day of current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('total_input_tokens, total_output_tokens')
    .eq('user_id', user.id)
    .gte('created_at', monthStart)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const totalInput = rows.reduce((s, r) => s + (r.total_input_tokens ?? 0), 0)
  const totalOutput = rows.reduce((s, r) => s + (r.total_output_tokens ?? 0), 0)

  return NextResponse.json({ input_tokens: totalInput, output_tokens: totalOutput })
}
