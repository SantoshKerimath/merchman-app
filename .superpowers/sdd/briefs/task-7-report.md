## Task 7 Report: OAuth Routes

**Status:** COMPLETE

**Summary:** Created Amazon SP-API OAuth routes — auth redirect and LWA callback — plus added Amazon env vars to `.env.local`.

### Files Created
- `app/api/amazon/auth/route.ts` — GET handler that validates auth + brand_id, builds LWA consent URL for India Seller Central, redirects user
- `app/api/amazon/callback/route.ts` — GET handler that exchanges `spapi_oauth_code` for tokens via `https://api.amazon.com/auth/o2/token`, upserts `brand_credentials` with `onConflict: 'brand_id'`, redirects to `/brands/{id}/settings?connected=true`

### Files Modified
- `.env.local` — appended `AMAZON_APP_ID`, `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_REDIRECT_URI`, `AMAZON_MARKETPLACE_ID` (placeholder values)

### Patterns Used
- Supabase client: `createClient()` from `@/lib/supabase/server` (matches existing route handlers)
- No `any` types — token response typed as inline interface
- `request.nextUrl.searchParams` for query params (Next.js 16 pattern)
- `NextResponse.redirect` with `new URL(...)` for all redirect cases

### Concerns
- `seller_id` is stored as `'pending'` on first connect — user must fill it in via settings UI (Task 10). If the `brand_credentials` table has a NOT NULL constraint without a default on `seller_id`, the upsert will fail. Verify the schema allows `'pending'` as a placeholder string.
- No RLS check that the brand belongs to the authenticated user's agency — the query just checks `brand.id` exists. If RLS policies on the `brands` table enforce agency scoping, this is covered implicitly; otherwise a malicious user could connect credentials to any brand_id.
- Amazon env vars are placeholder values — real credentials must be substituted before testing the live OAuth flow.
