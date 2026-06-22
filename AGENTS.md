# MerchMan — Agent Context

> Source of truth for AI agents. Read before writing code.

---

## What This Is

MerchMan: AI-powered Amazon merchant analytics SaaS for Indian brand agencies. Pilot client: **Growz Scalers** (brands: Cadlec, Kridlo, TinyLane).

**Builder:** Santosh Kerimath (kerimathsantosh@gmail.com)
**Started:** 17 Jun 2026 | **Status:** Day 8 complete.

---

## ⚠️ Framework Warning

**Next.js 16** + **React 19** + **Tailwind v4**. NOT same as training data:
- `middleware.ts` deprecated → use `proxy.ts` (but `middleware.ts` still works)
- Tailwind config: `app/globals.css` via `@import "tailwindcss"`, no `tailwind.config.js`
- Dynamic route `params` is `Promise<{ id: string }>` — must `await`
- Check `node_modules/next/dist/docs/` before framework-level code

---

## Supabase

**Project:** `ibdpdgoibtumujyoghju` | **Region:** ap-northeast-2
**URL:** https://ibdpdgoibtumujyoghju.supabase.co
**Tables (9):** `agencies`, `team_members`, `brands`, `products`, `settlements`, `ppc_data`, `daily_metrics`, `alerts`, `knowledge_entries`

**⚠️ RLS on ALL tables.** `my_agency_id()` must stay `SECURITY DEFINER`:
```sql
-- Returns auth.uid()'s agency_id, bypasses RLS on team_members
SELECT agency_id FROM public.team_members WHERE id = auth.uid() LIMIT 1;
```
Without `SECURITY DEFINER` → infinite recursion → "stack depth limit exceeded". Do NOT change.

**Clients:**
- `lib/supabase/client.ts` — browser (anon key)
- `lib/supabase/server.ts` — SSR client (`createClient`) + `createServiceClient()` (service role)
- User-facing queries: SSR client (RLS enforced)
- Background/agent tasks: `createServiceClient()` only

---

## Auth

- Supabase Auth, email + password
- Login: `kerimathsantosh@gmail.com` / `Merchman@123`
- Signup trigger `handle_new_user()` auto-creates `agencies` + `team_members` row
- Trigger wrapped in `BEGIN...EXCEPTION WHEN OTHERS THEN RAISE LOG` — auth never blocked by trigger failures

---

## Active Plugins & Workflow Gates

**Caveman** — token-efficient comms, active by default.
**Superpowers** — mandatory pre-work gates:
- `brainstorming` before building any feature
- `writing-plans` before multi-step implementation
- `systematic-debugging` before fixing bugs
- `verification-before-completion` before marking done
**UI-UX Pro Max** — use for Day 6–9 dashboard charts, product table, KPI strip.
**Supabase MCP** — run SQL/migrations directly, no copy-paste to SQL editor.
**Figma MCP** — future UI design work.

---

## What's Built (22 Jun 2026)

| Feature | Status | Location |
|---|---|---|
| Landing page | ✅ Live | https://merchman.tarkavada.com |
| Login / signup | ✅ | `app/(auth)/` |
| Auth middleware | ✅ | `middleware.ts` |
| Command Center | ✅ | `app/(dashboard)/dashboard/page.tsx` |
| Settings (brand create) | ✅ | `app/(dashboard)/settings/page.tsx` |
| XLSX upload UI | ✅ | `app/(dashboard)/brands/[id]/upload/page.tsx` |
| Upload API | ✅ | `app/api/brands/[id]/upload/route.ts` |
| Settlement parser | ✅ | `lib/parsers/settlement.ts` |
| PPC parser | ✅ | `lib/parsers/ppc.ts` |
| Brand P&L dashboard | ✅ | `app/(dashboard)/brands/[id]/page.tsx` |
| P&L engine | ✅ | `lib/pl-engine/compute.ts` |
| Sidebar | ✅ | `components/dashboard/Sidebar.tsx` |
| Product COGS entry | ✅ | `components/dashboard/ProductsCOGSTable.tsx` |
| Net profit calc | ✅ | `app/(dashboard)/brands/[id]/page.tsx` |
| Advertising KPI strip | ✅ | `components/dashboard/AdvertisingKPIs.tsx` |
| PPC import (upload ext.) | ✅ | `app/api/brands/[id]/upload/route.ts` |
| Date range filter | ✅ | `components/dashboard/DateFilterBar.tsx` |
| Daily sales chart | ✅ | `components/charts/DailySalesChart.tsx` |
| Organic vs PPC chart | ✅ | `components/charts/OrganicVsPPCChart.tsx` |
| ACOS trend chart | ✅ | `components/charts/ACOSTrendChart.tsx` |
| Spend vs sales chart | ✅ | `components/charts/SpendVsSalesChart.tsx` |
| Product breakdown table | ✅ | `components/dashboard/ProductTable.tsx` |
| Portfolio stats strip | ✅ | `app/(dashboard)/dashboard/page.tsx` |
| Brand sort (Sales/Net Revenue/ACOS) | ✅ | `components/dashboard/SortBar.tsx` |
| Brand pinning | ✅ | `components/dashboard/PinButton.tsx` + `api/brands/[id]/pin/route.ts` |
| Attention badges (High ACOS, No COGS) | ✅ | `app/(dashboard)/dashboard/page.tsx` |
| SP-API integration | ⏳ Awaiting Amazon approval | — |
| Inngest jobs | ⏳ Keys missing | — |
| Monitor agent | ⏳ Not started | — |
| Talk-to-Data | ⏳ Not started | — |
| WATI WhatsApp | ⏳ Keys missing | — |

---

## Settlement Parser — Column Mapping

File: `lib/parsers/settlement.ts`
Sheet: "Sales Database" | Row 1: title (skip) | Row 2: headers | Row 3+: data
Confirmed from real Kridlo data (1,343 rows):

| Col | Field | Col | Field |
|---|---|---|---|
| 0 | date/time | 14 | FBA fees |
| 1 | settlement id | 15 | selling fees |
| 2 | type | 16 | other transaction fees |
| 3 | order id | 17 | other |
| 4 | sku | 18 | total |
| 5 | quantity | 19 | tracking id |
| 6 | product sales | 20 | city |
| 7 | shipping credits | 21 | state |
| 8 | promotional rebates | 22 | postal code |
| 9 | TCS-CGST | 23 | country |
| 10 | TCS-SGST | 24 | promotion ids |
| 11 | TCS-IGST | 25 | B2B |
| 12 | TDS (194-O) | 26 | fulfillment |
| 13 | other | | |

---

## P&L Engine

File: `lib/pl-engine/compute.ts`

```typescript
grossProfit = productSales - |FBA fees| - |referral fees| - TCS(CGST+SGST+IGST) - |TDS|
netProfit = grossProfit - COGS - PPCSpend  // COGS not yet implemented
```

Helpers: `formatINR(n)`, `formatPercent(n)`, `computePL()`, `computeACoS()`, `computeTACOs()`, `computeROAS()`

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/brands` | GET | List brands for user's agency |
| `/api/brands` | POST | Create brand |
| `/api/brands/[id]/upload` | POST | Parse XLSX + batch insert settlements |

All routes: check auth (401 if not logged in), use SSR client (RLS enforced).

---

## Env Vars

```
NEXT_PUBLIC_SUPABASE_URL      ✅ Set
NEXT_PUBLIC_SUPABASE_ANON_KEY ✅ Set
SUPABASE_SERVICE_ROLE_KEY     ✅ Set
SP_AWS_REGION                 eu-west-1 ✅
SP_CLIENT_ID                  ⏳ Pending SP-API approval
SP_CLIENT_SECRET              ⏳ Pending
SP_AWS_ACCESS_KEY             ⏳ Pending
SP_AWS_SECRET_KEY             ⏳ Pending
ANTHROPIC_API_KEY             ⏳ Not added
INNGEST_EVENT_KEY             ⏳ Not configured
INNGEST_SIGNING_KEY           ⏳ Not configured
WATI_TOKEN                    ⏳ Not configured
WATI_BASE_URL                 ⏳ Not configured
RESEND_API_KEY                ⏳ Not configured
NEXT_PUBLIC_APP_URL           http://localhost:3000
```


---
## Amazon SP-API

- Registered via Solution Provider Portal (public dev, no seller account needed)
- Udyam MSME used for identity verification
- **Status:** Verified, OAuth + reporting implemented
- Marketplace: `A21TJRUUN4KGV` | Region endpoint: `eu-west-1`

## Day 8 — SP-API Infrastructure + Multi-Report Parsers

### New files
- `lib/amazon/lwa.ts` — LWA token refresh. `getAccessToken(config, cached?)` returns `{ token, expiresAt }`. Caches with 60s expiry buffer.
- `lib/amazon/sp-api.ts` — `spRequest(accessToken, method, path, body?)`. Base URL set by `AMAZON_SANDBOX` env var.
- `lib/amazon/reports.ts` — `requestReport / pollReport / downloadReport`. Sandbox: returns fixture strings, no real HTTP. `SyncTimeoutError` thrown after 2min.
- `lib/parsers/settlement-v2.ts` — `parseSettlementV2(tsvText)`. Groups V2 rows by `(settlement-id, order-id, sku, posted-date)`, pivots `amount-type`/`amount-description`/`amount` into `ParsedSettlement`. Same output interface as `settlement.ts`.
- `lib/parsers/advertising-campaign.ts` — `parseAdvertisingCampaign(csvText)`. Handles quoted CSV, ₹ formatting, MM/DD/YYYY dates. Outputs `ParsedPPC[]`.
- `lib/parsers/business-report.ts` — `parseBusinessReport(csvText)`. DD/MM/YY dates, % → decimal. Outputs `ParsedBusinessMetric[]` → `business_metrics` table.
- `app/api/amazon/auth/route.ts` — redirects to LWA consent URL with `state=brand_id`.
- `app/api/amazon/callback/route.ts` — exchanges `spapi_oauth_code` → `refresh_token`, upserts `brand_credentials`.
- `app/api/brands/[id]/sync/route.ts` — full pipeline: token refresh → requestReport → pollReport → downloadReport → parse → upsert. Writes `sync_logs`.
- `app/api/brands/[id]/credentials/route.ts` — PATCH updates `sync_schedule`, DELETE disconnects.
- `app/components/settings/SyncControls.tsx` — client: per-report-type sync buttons + last sync status.
- `app/components/settings/ScheduleConfig.tsx` — client: manual/daily/weekly/custom schedule + on-login toggle. Auto-saves on change.
- `app/app/(dashboard)/brands/[id]/settings/page.tsx` — settings page: connection status, sync now, schedule.
- `app/components/charts/SessionsConversionChart.tsx` — dual-axis ComposedChart: sessions (left/navy) + CVR% (right/teal).

### Modified files
- `app/app/(dashboard)/brands/[id]/page.tsx` — gear icon → settings, `SessionsConversionChart` added to chart grid.

### New DB tables
- `brand_credentials` — per-brand SP-API tokens + sync schedule config. UNIQUE(brand_id).
- `sync_logs` — audit trail: trigger, report_type, status, rows_inserted, api_calls_used.
- `business_metrics` — daily ordered_sales, units, sessions, CVR, avg price. UNIQUE(brand_id, date).

### Key patterns
- `AMAZON_SANDBOX=true` → sandbox URLs + fixture data; no code change for prod flip
- Parsers: all pure functions, `ParseResult<T>` output, Vitest-tested
- Sync route: idempotent — settlements append, ppc_data delete+reinsert, business_metrics upsert on (brand_id, date)


---
---

## What's Next (Day 8+)

Day 8 candidates:
- SP-API OAuth flow (when Amazon approval arrives)
- Inngest jobs setup (settlement-sync, ppc-sync daily cron)
- Brand page: date range comparison (current vs prior period)
