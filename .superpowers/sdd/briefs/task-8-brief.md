## Task 8: Sync API Route

**Files:**
- Create: `app/api/brands/[id]/sync/route.ts`

**Interfaces:**
- Consumes: `getAccessToken` (Task 6), `requestReport`/`pollReport`/`downloadReport` (Task 6), all three parsers (Tasks 3–5), `brand_credentials` + `sync_logs` + `settlements` + `ppc_data` + `business_metrics` tables
- Produces: `POST /api/brands/[id]/sync` → `{ success: true, inserted, skipped, api_calls_used, errors }`

- [ ] **Step 1: Create `app/api/brands/[id]/sync/route.ts`**

```typescript
// app/app/api/brands/[id]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken, type LwaConfig } from '@/lib/amazon/lwa'
import {
  requestReport, pollReport, downloadReport,
  SyncTimeoutError, type ReportType,
} from '@/lib/amazon/reports'
import { parseSettlementV2 } from '@/lib/parsers/settlement-v2'
import { parseAdvertisingCampaign } from '@/lib/parsers/advertising-campaign'
import { parseBusinessReport } from '@/lib/parsers/business-report'

type SyncReportType = 'settlement' | 'advertising' | 'business' | 'all'

const REPORT_TYPE_MAP: Record<Exclude<SyncReportType, 'all'>, ReportType> = {
  settlement: 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2',
  advertising: 'GET_SPONSORED_PRODUCTS_REPORT',
  business: 'GET_SALES_AND_TRAFFIC_REPORT',
}

const CHUNK = 500

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    report_type: SyncReportType
    date_from?: string
    date_to?: string
  }
  const { report_type, date_from, date_to } = body

  // Fetch credentials
  const { data: creds } = await supabase
    .from('brand_credentials')
    .select('*')
    .eq('brand_id', brandId)
    .single()

  if (!creds) {
    return NextResponse.json({ error: 'Amazon account not connected' }, { status: 400 })
  }

  // Create sync log
  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({
      brand_id: brandId,
      trigger: 'manual',
      report_type,
      status: 'processing',
    })
    .select('id')
    .single()

  const logId = syncLog?.id

  let totalInserted = 0
  let totalSkipped = 0
  const allErrors: string[] = []
  let apiCalls = 0

  try {
    // Refresh LWA token
    const lwaConfig: LwaConfig = {
      clientId: creds.lwa_client_id,
      clientSecret: creds.lwa_client_secret,
      refreshToken: creds.lwa_refresh_token,
    }
    const cached = creds.access_token_cache && creds.access_token_expires_at
      ? { token: creds.access_token_cache, expiresAt: new Date(creds.access_token_expires_at) }
      : undefined

    const tokenResult = await getAccessToken(lwaConfig, cached)
    const accessToken = tokenResult.token

    // Persist refreshed token
    await supabase.from('brand_credentials').update({
      access_token_cache: tokenResult.token,
      access_token_expires_at: tokenResult.expiresAt.toISOString(),
    }).eq('brand_id', brandId)

    const dataStartTime = date_from ?? new Date(Date.now() - 30 * 86400 * 1000).toISOString().split('T')[0]
    const dataEndTime = date_to ?? new Date().toISOString().split('T')[0]

    const typesToSync: Exclude<SyncReportType, 'all'>[] =
      report_type === 'all'
        ? ['settlement', 'advertising', 'business']
        : [report_type as Exclude<SyncReportType, 'all'>]

    for (const type of typesToSync) {
      const reportType = REPORT_TYPE_MAP[type]

      const reportId = await requestReport(accessToken, reportType, dataStartTime, dataEndTime)
      apiCalls++

      const documentId = await pollReport(accessToken, reportId)
      apiCalls += 3 // approximate poll count

      const rawContent = await downloadReport(accessToken, documentId)
      apiCalls++

      if (type === 'settlement') {
        const { rows, skipped, errors } = parseSettlementV2(rawContent)
        totalSkipped += skipped
        allErrors.push(...errors)

        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
          const { error } = await supabase.from('settlements').insert(chunk)
          if (error) throw new Error(`Settlement insert error: ${error.message}`)
          totalInserted += chunk.length
        }
      }

      if (type === 'advertising') {
        const { rows, skipped, errors } = parseAdvertisingCampaign(rawContent)
        totalSkipped += skipped
        allErrors.push(...errors)

        if (rows.length > 0) {
          await supabase.from('ppc_data').delete().eq('brand_id', brandId)
          for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
            const { error } = await supabase.from('ppc_data').insert(chunk)
            if (error) throw new Error(`PPC insert error: ${error.message}`)
            totalInserted += chunk.length
          }
        }
      }

      if (type === 'business') {
        const { rows, skipped, errors } = parseBusinessReport(rawContent)
        totalSkipped += skipped
        allErrors.push(...errors)

        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
          const { error } = await supabase.from('business_metrics').upsert(chunk, {
            onConflict: 'brand_id,date',
          })
          if (error) throw new Error(`Business metrics upsert error: ${error.message}`)
          totalInserted += chunk.length
        }
      }
    }

    // Update sync log
    await supabase.from('sync_logs').update({
      status: 'done',
      rows_inserted: totalInserted,
      api_calls_used: apiCalls,
      completed_at: new Date().toISOString(),
    }).eq('id', logId)

    // Update last_sync_at on credentials
    await supabase.from('brand_credentials').update({
      last_sync_at: new Date().toISOString(),
    }).eq('brand_id', brandId)

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      api_calls_used: apiCalls,
      errors: allErrors.slice(0, 5),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const status = e instanceof SyncTimeoutError ? 503 : 500

    await supabase.from('sync_logs').update({
      status: 'error',
      error_message: msg,
      api_calls_used: apiCalls,
      completed_at: new Date().toISOString(),
    }).eq('id', logId)

    return NextResponse.json({ error: msg }, { status })
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd app && git add app/api/brands/\[id\]/sync/ && git commit -m "feat(api): sync route — token refresh, report fetch, parse, upsert, sync_logs"
```

---

