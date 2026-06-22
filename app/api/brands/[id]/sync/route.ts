import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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

  const internalSecret = request.headers.get('x-inngest-secret')
  const isInternalCall = internalSecret && internalSecret === process.env.INNGEST_INTERNAL_SECRET

  if (!isInternalCall) {
    const ssrClient = await createClient()
    const { data: { user } } = await ssrClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Verify brand belongs to this user's agency (RLS check via SSR client)
    const { data: owned } = await ssrClient.from('brands').select('id').eq('id', brandId).single()
    if (!owned) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // All DB ops use service role (bypasses RLS — ownership already verified above via brands table)
  // TODO(td-001): split user vs internal sync routes post go-live — see docs/05_production_checklist.md
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json() as {
    report_type: SyncReportType
    date_from?: string
    date_to?: string
    trigger?: string
  }
  const { report_type, date_from, date_to, trigger: syncTrigger } = body

  // Fetch credentials (RLS on brands table ensures brand belongs to user)
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
      trigger: syncTrigger ?? 'manual',
      report_type,
      status: 'pending',
    })
    .select('id')
    .single()

  const logId = syncLog?.id

  let totalInserted = 0
  let totalSkipped = 0
  const allErrors: string[] = []
  let apiCalls = 0

  try {
    // Build LWA config and restore cached token if available
    const lwaConfig: LwaConfig = {
      clientId: creds.lwa_client_id,
      clientSecret: creds.lwa_client_secret,
      refreshToken: creds.lwa_refresh_token,
    }
    const cached = creds.access_token_cache && creds.access_token_expires_at
      ? { token: creds.access_token_cache as string, expiresAt: new Date(creds.access_token_expires_at as string) }
      : undefined

    const tokenResult = await getAccessToken(lwaConfig, cached)
    const accessToken = tokenResult.token

    // Persist refreshed token back to credentials
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

      // request → poll → download (approx 3 API calls per report cycle)
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
          await supabase
            .from('ppc_data')
            .delete()
            .eq('brand_id', brandId)
            .gte('start_date', dataStartTime)
            .lte('end_date', dataEndTime)
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

    // Update sync log to done
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
    const isTimeout = e instanceof SyncTimeoutError

    await supabase.from('sync_logs').update({
      status: 'error',
      error_message: msg,
      api_calls_used: apiCalls,
      completed_at: new Date().toISOString(),
    }).eq('id', logId)

    if (isTimeout) {
      return NextResponse.json({ error: 'timeout', retry_after: 30 }, { status: 503 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
