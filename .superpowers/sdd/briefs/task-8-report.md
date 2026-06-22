## Task 8 Report: Sync API Route

**Status:** DONE

**Summary:** Created `app/api/brands/[id]/sync/route.ts` (192 lines) — POST handler that authenticates the user, fetches `brand_credentials`, refreshes the LWA token via `getAccessToken()` (persisting the new cache), creates a `sync_logs` row, then for each requested report type calls `requestReport` → `pollReport` → `downloadReport`, parses with the appropriate parser, and upserts into the correct table (`settlements` insert, `ppc_data` delete+insert, `business_metrics` upsert on `brand_id,date`). On success updates sync_log to `done` and returns `{ success, inserted, skipped, api_calls_used, errors }`. `SyncTimeoutError` → 503 `{ error: 'timeout', retry_after: 30 }`; other errors → 500.

**Concerns:**
- `sync_logs` insert uses `status: 'pending'` (brief specifies this); brief's own code snippet used `'processing'` — went with `'pending'` to match brief text.
- `api_calls_used` counting is approximate: 1 for requestReport + 3 for pollReport (estimated poll iterations) + 1 for downloadReport = 5 per report type. Actual poll count varies.
- `brand_credentials` RLS relies on Supabase RLS policies being correctly set on `brands` table to prevent cross-user access; no explicit brand ownership check added beyond what RLS enforces.
- TypeScript check not run (npx blocked per instructions); types should be sound based on parser return signatures.
