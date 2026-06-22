import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Fire on-login syncs for brands configured with type = 'on_login'
  try {
    const { data: creds } = await supabase
      .from('brand_credentials')
      .select('brand_id, last_sync_at')
      .eq('sync_schedule->>type', 'on_login')

    if (creds?.length) {
      const today = toDateStr(new Date())
      const thirtyDaysAgo = toDateStr(new Date(Date.now() - 30 * 86400 * 1000))

      const events = creds.map(cred => ({
        name: 'brand/sync.requested' as const,
        data: {
          brand_id: cred.brand_id as string,
          date_from: cred.last_sync_at
            ? toDateStr(new Date(cred.last_sync_at as string))
            : thirtyDaysAgo,
          date_to: today,
          trigger: 'on_login' as const,
        },
      }))

      await inngest.send(events)
    }
  } catch (err) {
    // Don't block login if Inngest send fails
    console.error('[auth/callback] on-login sync error:', err)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
