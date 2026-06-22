import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { searchParams } = request.nextUrl
  const code = searchParams.get('spapi_oauth_code')
  const brandId = searchParams.get('state')

  if (!code || !brandId) {
    return NextResponse.redirect(new URL('/settings?error=oauth_missing_params', request.url))
  }

  // Verify brand exists and belongs to user's agency
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.redirect(
      new URL(`/brands/${brandId}/settings?error=brand_not_found`, request.url)
    )
  }

  try {
    // Exchange authorization code for LWA tokens
    const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.AMAZON_CLIENT_ID ?? '',
        client_secret: process.env.AMAZON_CLIENT_SECRET ?? '',
        redirect_uri: process.env.AMAZON_REDIRECT_URI ?? '',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('LWA token exchange failed:', err)
      return NextResponse.redirect(
        new URL(`/brands/${brandId}/settings?error=oauth_failed`, request.url)
      )
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Upsert credentials — UNIQUE(brand_id) constraint handles duplicates
    const { error } = await supabase.from('brand_credentials').upsert(
      {
        brand_id: brandId,
        seller_id: 'pending', // user fills in settings after connect
        marketplace_id: process.env.AMAZON_MARKETPLACE_ID ?? 'A21TJRUUN4KGV',
        lwa_client_id: process.env.AMAZON_CLIENT_ID ?? '',
        lwa_client_secret: process.env.AMAZON_CLIENT_SECRET ?? '',
        lwa_refresh_token: tokens.refresh_token,
        access_token_cache: tokens.access_token,
        access_token_expires_at: expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'brand_id' }
    )

    if (error) throw error

    return NextResponse.redirect(
      new URL(`/brands/${brandId}/settings?connected=true`, request.url)
    )
  } catch (e) {
    console.error('OAuth callback error:', e)
    return NextResponse.redirect(
      new URL(`/brands/${brandId}/settings?error=oauth_failed`, request.url)
    )
  }
}
