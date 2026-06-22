## Task 7: OAuth Routes

**Files:**
- Create: `app/api/amazon/auth/route.ts`
- Create: `app/api/amazon/callback/route.ts`

**Interfaces:**
- Consumes: `brand_credentials` table (Task 1), `getAccessToken` from `lib/amazon/lwa.ts`
- Produces: OAuth connect flow; `brand_credentials` row upserted on callback

**Env vars required:** `AMAZON_APP_ID`, `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_REDIRECT_URI`

- [ ] **Step 1: Add env vars to `.env.local`**

```bash
# Amazon SP-API (sandbox)
AMAZON_SANDBOX=true
AMAZON_APP_ID=amzn1.sellerapps.app.placeholder
AMAZON_CLIENT_ID=amzn1.application-oa2-client.placeholder
AMAZON_CLIENT_SECRET=placeholder-secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/amazon/callback
AMAZON_MARKETPLACE_ID=A21TJRUUN4KGV
```

- [ ] **Step 2: Create `app/api/amazon/auth/route.ts`**

```typescript
// app/app/api/amazon/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
```

- [ ] **Step 3: Create `app/api/amazon/callback/route.ts`**

```typescript
// app/app/api/amazon/callback/route.ts
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
    return NextResponse.redirect(new URL(`/settings?error=oauth_missing_params`, request.url))
  }

  // Verify brand belongs to user
  const { data: brand } = await supabase
    .from('brands').select('id').eq('id', brandId).single()
  if (!brand) {
    return NextResponse.redirect(new URL(`/settings?error=brand_not_found`, request.url))
  }

  try {
    // Exchange authorization code for tokens
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

    // Upsert credentials
    const { error } = await supabase.from('brand_credentials').upsert({
      brand_id: brandId,
      seller_id: 'pending', // user fills in settings after connect
      marketplace_id: process.env.AMAZON_MARKETPLACE_ID ?? 'A21TJRUUN4KGV',
      lwa_client_id: process.env.AMAZON_CLIENT_ID ?? '',
      lwa_client_secret: process.env.AMAZON_CLIENT_SECRET ?? '',
      lwa_refresh_token: tokens.refresh_token,
      access_token_cache: tokens.access_token,
      access_token_expires_at: expiresAt.toISOString(),
      connected_at: new Date().toISOString(),
    }, { onConflict: 'brand_id' })

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
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd app && git add app/api/amazon/ && git commit -m "feat(api): Amazon OAuth routes (auth redirect + LWA callback)"
```

---

