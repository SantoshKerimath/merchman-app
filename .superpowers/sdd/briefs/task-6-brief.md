## Task 6: LWA Token Manager + SP-API Client + Reports Pipeline

**Files:**
- Create: `lib/amazon/lwa.ts`
- Create: `lib/amazon/sp-api.ts`
- Create: `lib/amazon/reports.ts`

**Interfaces:**
- Produces:
  - `getAccessToken(config: LwaConfig, cached?: TokenCache): Promise<{ token: string; expiresAt: Date }>`
  - `spRequest(accessToken: string, method: 'GET'|'POST', path: string, body?: object): Promise<Response>`
  - `getBaseUrl(): string`
  - `requestReport(accessToken: string, reportType: ReportType, dataStartTime: string, dataEndTime: string): Promise<string>`
  - `pollReport(accessToken: string, reportId: string, maxWaitMs?: number): Promise<string>`
  - `downloadReport(accessToken: string, reportDocumentId: string): Promise<string>`
  - `SyncTimeoutError` class

- [ ] **Step 1: Create `lib/amazon/lwa.ts`**

```typescript
// app/lib/amazon/lwa.ts

export interface LwaConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export interface TokenCache {
  token: string
  expiresAt: Date
}

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const EXPIRY_BUFFER_SECS = 60

export async function getAccessToken(
  config: LwaConfig,
  cached?: TokenCache
): Promise<TokenCache> {
  // Return cached token if still valid (with buffer)
  if (cached) {
    const bufferMs = EXPIRY_BUFFER_SECS * 1000
    if (cached.expiresAt.getTime() - Date.now() > bufferMs) {
      return cached
    }
  }

  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LWA token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    token: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}
```

- [ ] **Step 2: Create `lib/amazon/sp-api.ts`**

```typescript
// app/lib/amazon/sp-api.ts

const SANDBOX_BASE = 'https://sandbox.sellingpartnerapi-in.amazon.com'
const PROD_BASE    = 'https://sellingpartnerapi-in.amazon.com'

export function getBaseUrl(): string {
  return process.env.AMAZON_SANDBOX === 'true' ? SANDBOX_BASE : PROD_BASE
}

export async function spRequest(
  accessToken: string,
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SP-API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res
}
```

- [ ] **Step 3: Create `lib/amazon/reports.ts`**

```typescript
// app/lib/amazon/reports.ts
import { spRequest } from './sp-api'

export type ReportType =
  | 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2'
  | 'GET_SPONSORED_PRODUCTS_REPORT'
  | 'GET_SALES_AND_TRAFFIC_REPORT'

export class SyncTimeoutError extends Error {
  constructor(reportId: string) {
    super(`Report ${reportId} did not complete within the timeout period`)
    this.name = 'SyncTimeoutError'
  }
}

// Sandbox fixture responses — used when AMAZON_SANDBOX=true
const SANDBOX_FIXTURES: Record<ReportType, string> = {
  GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2:
    'settlement-id\tsettlement-start-date\tsettlement-end-date\tdeposit-date\ttotal-amount\tcurrency\ttransaction-type\torder-id\tmerchant-order-id\tadjustment-id\tshipment-id\tmarketplace-name\tamount-type\tamount-description\tamount\tfulfillment-id\tposted-date\tmerchant-order-item-id\tmerchant-adjustment-item-id\tsku\tquantity-purchased\tpromotion-id\n' +
    '100001\t2026-03-01\t2026-03-31\t2026-04-05\t50000.00\tINR\tOrder\tORD-SANDBOX-001\t\t\t\tAmazon.in\tItemPrice\tPrincipal\t1999.00\tAFN\t2026-03-15\t\t\tSANDBOX-SKU-001\t1\t\n' +
    '100001\t2026-03-01\t2026-03-31\t2026-04-05\t50000.00\tINR\tOrder\tORD-SANDBOX-001\t\t\t\tAmazon.in\tCommission\tReferralFee\t-299.85\tAFN\t2026-03-15\t\t\tSANDBOX-SKU-001\t1\t\n' +
    '100001\t2026-03-01\t2026-03-31\t2026-04-05\t50000.00\tINR\tOrder\tORD-SANDBOX-001\t\t\t\tAmazon.in\tFBAPerUnitFulfillmentFee\tFBAPerUnitFulfillmentFee\t-75.00\tAFN\t2026-03-15\t\t\tSANDBOX-SKU-001\t1\t',
  GET_SPONSORED_PRODUCTS_REPORT:
    'State,Campaign name,Status,Type,Targeting,Campaign start date,Campaign end date,Campaign budget amount (converted),Campaign budget amount,Top-of-search impression share,Top-of-search bid adjustment,Clicks,CTR,Total cost (converted),Total cost,CPC (converted),CPC,Purchases,Sales (converted),Sales,ROAS\n' +
    'ENABLED,Sandbox Campaign,CAMPAIGN_STATUS_ENABLED,SP,MANUAL,01/01/2026,,₹500.00,₹500.00,25.00%,0.80,150,0.0075,₹3000.00,₹3000.00,₹20.00,₹20.00,12,₹18000.00,₹18000.00,6.0',
  GET_SALES_AND_TRAFFIC_REPORT:
    'Date,Ordered Product Sales,Ordered Product Sales - B2B,Units Ordered,Units Ordered - B2B,Total Order Items,Total Order Items - B2B,Average Sales per Order Item,Average Sales per Order Item - B2B,Average Units per Order Item,Average Units per Order Item - B2B,Average Selling Price,Average Selling Price - B2B,Sessions - Total,Sessions - Total - B2B,Order Item Session Percentage,Order Item Session Percentage - B2B,Average Offer Count\n' +
    '01/04/26,"₹75,565.26",₹0.00,39,0,38,0,"₹1,988.56",₹0.00,1.03,0.00,"₹1,937.57",₹0.00,"1,514",30,2.51%,0.00%,238',
}

export async function requestReport(
  accessToken: string,
  reportType: ReportType,
  dataStartTime: string,
  dataEndTime: string
): Promise<string> {
  if (process.env.AMAZON_SANDBOX === 'true') {
    return `sandbox-report-id-${reportType}`
  }

  const res = await spRequest(accessToken, 'POST', '/reports/2021-06-30/reports', {
    reportType,
    dataStartTime,
    dataEndTime,
    marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID ?? 'A21TJRUUN4KGV'],
  })
  const data = await res.json() as { reportId: string }
  return data.reportId
}

export async function pollReport(
  accessToken: string,
  reportId: string,
  maxWaitMs = 120_000
): Promise<string> {
  if (process.env.AMAZON_SANDBOX === 'true') {
    return `sandbox-document-id-${reportId}`
  }

  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const res = await spRequest(accessToken, 'GET', `/reports/2021-06-30/reports/${reportId}`)
    const data = await res.json() as { processingStatus: string; reportDocumentId?: string }

    if (data.processingStatus === 'DONE') {
      if (!data.reportDocumentId) throw new Error('Report done but no documentId')
      return data.reportDocumentId
    }
    if (data.processingStatus === 'FATAL') {
      throw new Error(`Report ${reportId} failed with FATAL status`)
    }
    // PROCESSING or IN_QUEUE — wait
    await new Promise(r => setTimeout(r, 5_000))
  }

  throw new SyncTimeoutError(reportId)
}

export async function downloadReport(
  accessToken: string,
  reportDocumentId: string
): Promise<string> {
  if (process.env.AMAZON_SANDBOX === 'true') {
    // Extract report type from sandbox document ID
    const typeKey = reportDocumentId.replace('sandbox-document-id-sandbox-report-id-', '') as ReportType
    return SANDBOX_FIXTURES[typeKey] ?? ''
  }

  const res = await spRequest(accessToken, 'GET', `/reports/2021-06-30/documents/${reportDocumentId}`)
  const data = await res.json() as { url: string }

  const fileRes = await fetch(data.url)
  if (!fileRes.ok) throw new Error(`Failed to download report document: ${fileRes.status}`)
  return fileRes.text()
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd app && git add lib/amazon/ && git commit -m "feat(amazon): LWA token manager, SP-API client, report pipeline with sandbox fixtures"
```

---

