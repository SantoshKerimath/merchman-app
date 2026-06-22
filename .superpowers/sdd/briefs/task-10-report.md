## Task 10 Report: Settings Page + Client Components

**Status:** COMPLETE

**Summary:** Created 4 files implementing the Amazon connection settings page with sync controls and schedule configuration.

### Files Created

- `app/components/settings/SyncControls.tsx` — client component, 3 sync buttons (settlement/advertising/business), calls `POST /api/brands/[id]/sync`, shows last sync time and row count from sync_logs
- `app/components/settings/ScheduleConfig.tsx` — client component, manual/daily/weekly/custom radio tabs, day-of-week picker, time input, on_login toggle, auto-saves via `PATCH /api/brands/[id]/credentials`
- `app/components/settings/DisconnectButton.tsx` — thin client component extracted for the confirm+DELETE flow (can't inline `'use client'` mid-page)
- `app/app/(dashboard)/brands/[id]/settings/page.tsx` — server component, fetches brand/creds/sync_logs, renders 3 sections: Amazon Connection, Sync Now, Auto-sync Schedule; handles `?connected=true` and `?error=...` query params; shows sandbox banner when `AMAZON_SANDBOX=true`

### Deviations from Brief

- Brief had `DisconnectButton` inlined as a function with `'use client'` directive mid-file — this is invalid in Next.js App Router. Extracted to `components/settings/DisconnectButton.tsx`.
- Cast `creds?.sync_schedule` through `unknown` first (`as unknown as SyncSchedule`) to satisfy TypeScript's Json → SyncSchedule conversion.

### TypeScript Check

Zero new errors introduced. Pre-existing errors (vitest module types, sync/route.ts arg types) unchanged from prior tasks.
