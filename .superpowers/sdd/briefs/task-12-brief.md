## Task 12: Docs Update

**Files:**
- Modify: `app/AGENTS.md`
- Modify: `docs/04_project_plan.md`

- [ ] **Step 1: Update `app/AGENTS.md`**

Add Day 8 section:
```markdown
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
```

- [ ] **Step 2: Update `docs/04_project_plan.md`**

Mark Day 8 checkboxes as done and add completion note:
```markdown
### 22 June 2026 — Day 8

**Completed:**
- [x] DB: `brand_credentials`, `sync_logs`, `business_metrics` tables + RLS
- [x] `lib/amazon/lwa.ts` — LWA token manager
- [x] `lib/amazon/sp-api.ts` — SP-API fetch wrapper with sandbox env switch
- [x] `lib/amazon/reports.ts` — report pipeline: requestReport → pollReport → downloadReport (sandbox fixtures)
- [x] `lib/parsers/settlement-v2.ts` — Flat File V2 grouped-pivot parser (Vitest tested)
- [x] `lib/parsers/advertising-campaign.ts` — Campaign CSV parser (Vitest tested)
- [x] `lib/parsers/business-report.ts` — Business Report CSV parser (Vitest tested)
- [x] OAuth routes: `/api/amazon/auth` + `/api/amazon/callback`
- [x] `/api/brands/[id]/sync` — full sync pipeline with sync_logs audit
- [x] `/api/brands/[id]/credentials` — PATCH schedule + DELETE disconnect
- [x] Settings page: Amazon Connection + Sync Now + Auto-sync Schedule
- [x] `SessionsConversionChart` — dual-axis sessions + CVR, added to brand page
- [x] Vitest configured, 14 parser unit tests passing

**Next session:** Day 9 — Talk-to-Data chat UI or SP-API approval follow-up
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd app && npx tsc --noEmit && git add AGENTS.md && git commit -m "docs: Day 8 complete — SP-API infra, 3 parsers, settings, business chart"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| `brand_credentials` table | Task 1 |
| `sync_logs` table | Task 1 |
| `business_metrics` table | Task 1 |
| `lib/amazon/lwa.ts` | Task 6 |
| `lib/amazon/sp-api.ts` | Task 6 |
| `lib/amazon/reports.ts` | Task 6 |
| Settlement V2 parser | Task 3 |
| Advertising campaign parser | Task 4 |
| Business report parser | Task 5 |
| `/api/amazon/auth` | Task 7 |
| `/api/amazon/callback` | Task 7 |
| `/api/brands/[id]/sync` | Task 8 |
| `/api/brands/[id]/credentials` | Task 9 |
| Settings page | Task 10 |
| SyncControls | Task 10 |
| ScheduleConfig | Task 10 |
| SessionsConversionChart | Task 11 |
| Brand page gear icon | Task 11 |
| Docs update | Task 12 |
| `AMAZON_SANDBOX` env var | Task 7 (env file) |
| Disconnect button | Task 10 |
| `sync_schedule` JSONB persisted | Tasks 9 + 10 |

All spec sections covered. ✅

**Placeholder scan:** No TBD, TODO, or "handle edge cases" patterns found. All error handlers are explicit.

**Type consistency:**
- `ParseResult<T>` defined in `settlement-v2.ts`, imported by `advertising-campaign.ts` and `business-report.ts` ✅
- `ParsedSettlement` interface from `settlement.ts` (unchanged) — `settlement-v2.ts` maps to it ✅
- `ParsedPPC` from `ppc.ts` (unchanged) — `advertising-campaign.ts` maps to it ✅
- `LwaConfig` + `TokenCache` defined in `lwa.ts`, consumed in `sync/route.ts` ✅
- `ReportType` defined in `reports.ts`, consumed in `sync/route.ts` ✅
- `SyncTimeoutError` exported from `reports.ts`, caught in `sync/route.ts` ✅
