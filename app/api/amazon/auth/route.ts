import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const brandId = request.nextUrl.searchParams.get('brand_id')
  if (!brandId) return NextResponse.json({ error: 'brand_id required' }, { status: 400 })

  const appId = process.env.AMAZON_APP_ID
  if (!appId) return NextResponse.json({ error: 'AMAZON_APP_ID not configured' }, { status: 500 })

  // LWA consent URL (India Seller Central)
  const params = new URLSearchParams({
    application_id: appId,
    state: brandId,
    version: 'beta',
  })
  const consentUrl = `https://sellercentral.amazon.in/apps/authorize/consent?${params}`
  return NextResponse.redirect(consentUrl)
}
