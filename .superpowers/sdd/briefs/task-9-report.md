# Task 9: Credentials API Route — COMPLETED

## Status: COMPLETE

## Summary
Created `app/api/brands/[id]/credentials/route.ts` with PATCH (update sync_schedule) and DELETE (disconnect Amazon) handlers. Both routes implement auth checks, proper error handling, and TypeScript types.

## Implementation Details

**File Created:** `app/api/brands/[id]/credentials/route.ts`

**PATCH Handler:**
- Updates `sync_schedule` on `brand_credentials` table
- Requires typed `SyncSchedule` object with `type`, `days`, `time`, `on_login`
- Returns 200 with `{ success: true }` on success
- Validates auth and required fields

**DELETE Handler:**
- Removes entire `brand_credentials` row (disconnects Amazon)
- Effectively removes all stored credentials for that brand
- Returns 200 with `{ success: true }` on success
- Validates auth

**Technical Notes:**
- Properly awaits `params` (Next.js 16 requirement)
- Uses `createClient()` from `@/lib/supabase/server` for auth and DB access
- RLS on `brand_credentials` ensures users can only modify their own brands
- `sync_schedule` cast to `unknown as Json` to satisfy Supabase type system
- No `any` types used
- All TypeScript checks pass for this file

## Key Features
✓ Auth check (401 if no user)
✓ No any types
✓ Proper Next.js 16 Promise<params> handling
✓ RLS-protected via Supabase
✓ Standard error response format
✓ Type-safe SyncSchedule interface

## Concerns
None. File passes TypeScript checks and implements spec exactly.

## Verification
- File exists at correct path
- TypeScript compilation passes for this file
- Follows project conventions and patterns
- Matches task brief requirements precisely
