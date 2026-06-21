# MerchMan — Agent Context

> This file is the source of truth for any AI agent working on this codebase.
> Read this before writing any code.

---

## What This Is

MerchMan is an AI-powered Amazon merchant analytics SaaS for Indian brand marketing agencies. The primary pilot client is **Growz Scalers**, an agency managing brands including Cadlec, Kridlo, and TinyLane on Amazon India.

**Builder:** Santosh Kerimath (kerimathsantosh@gmail.com)  
**Started:** 17 June 2026  
**Current status:** Day 3 complete. Data upload working end-to-end.

---

## ⚠️ Framework Warning

This project uses **Next.js 16** with **React 19** and **Tailwind v4**. This is NOT the Next.js you know from training data:
- `middleware.ts` is deprecated — use `proxy.ts` (but `middleware.ts` still works)
- Tailwind config is in `app/globals.css` via `@import "tailwindcss"`, not `tailwind.config.js`
- `params` in dynamic routes is a `Promise<{ id: string }>` — must be `await`ed
- Always check `node_modules/next/dist/docs/` before writing framework-level code

---

## Supabase

**Project ID:** `ibdpdgoibtumujyoghju`  
**Region:** ap-northeast-2  
**URL:** https://ibdpdgoibtumujyoghju.supabase.co

**9 tables:** `agencies`, `team_members`, `brands`, `products`, `settlements`, `ppc_data`, `daily_metrics`, `alerts`, `knowledge_entries`

**Critical: RLS is enabled on ALL tables.** The `my_agency_id()` helper is `SECURITY DEFINER`:
```sql
-- Returns auth.uid()'s agency_id, bypasses RLS on team_members
SELECT agency_id FROM public.team_members WHERE id = auth.uid() LIMIT 1;
```
Without `SECURITY DEFINER`, querying `team_members` under RLS creates infinite recursion ("stack depth limit exceeded"). Do NOT change this function.

**Clients:**
- `lib/supabase/client.ts` — browser (anon key)
- `lib/supabase/server.ts` — SSR client (`createClient`) + service role (`createServiceClient`)
- Use the SSR client for all user-facing queries — RLS is enforced
- Only use `createServiceClient()` for background jobs or agent tasks that run outside user context

---

## Auth

- Supabase Auth, email + password
- Login: `kerimathsantosh@gmail.com` / `Merchman@123`
- On signup, a trigger `handle_new_user()` auto-creates an `agencies` row and a `team_members` row
- The trigger is wrapped in `BEGIN...EXCEPTION WHEN OTHERS THEN RAISE LOG` so auth is never blocked by trigger failures

---

## What's Built (as of 18 June 2026)

| Feature | Status | Location |
|---|---|---|
| Landing page | ✅ Live | https://merchman.tarkavada.com |
| Login / signup | ✅ Working | `app/(auth)/` |
| Auth middleware | ✅ Working | `middleware.ts` |
| Command Center | ✅ Working | `app/(dashboard)/dashboard/page.tsx` |
| Settings (brand create) | ✅ Working | `app/(dashboard)/settings/page.tsx` |
| XLSX upload UI | ✅ Working | `app/(dashboard)/brands/[id]/upload/page.tsx` |
| Upload API | ✅ Working | `app/api/brands/[id]/upload/route.ts` |
| Settlement parser | ✅ Working | `lib/parsers/settlement.ts` |
| Brand P&L dashboard | ✅ Working | `app/(dashboard)/brands/[id]/page.tsx` |
| P&L engine | ✅ Working | `lib/pl-engine/compute.ts` |
| Sidebar | ✅ Working | `components/dashboard/Sidebar.tsx` |
| Product COGS entry | 🔜 Day 4 | Not started |
| Net profit calc | 🔜 Day 4 | Not started |
| Date range filter | 🔜 Day 6 | Not started |
| Charts | 🔜 Day 6 | Not started |
| SP-API integration | ⏳ Pending | Awaiting Amazon approval |
| Inngest jobs | ⏳ Pending | Keys not configured |
| Monitor agent | ⏳ Pending | Not started |
| Talk-to-Data | ⏳ Pending | Not started |
| WATI WhatsApp | ⏳ Pending | Keys not configured |

---

## Settlement Parser — Column Mapping

File: `lib/parsers/settlement.ts`

The Growz Scalers XLSX has a specific layout:
- Sheet name: "Sales Database" (search for sheet containing "sales")
- Row 1: Title row (skip)
- Row 2: Headers
- Row 3+: Data

Column indices (0-based) confirmed from real Kridlo data (1,343 rows):
- 0: date/time
- 1: settlement id
- 2: type
- 3: order id
- 4: sku
- 5: quantity
- 6: product sales
- 7: shipping credits
- 8: promotional rebates
- 9: TCS-CGST
- 10: TCS-SGST
- 11: TCS-IGST
- 12: TDS (Section 194-O)
- 13: other
- 14: FBA fees
- 15: selling fees
- 16: other transaction fees
- 17: other
- 18: total
- 19: tracking id
- 20: city
- 21: state
- 22: postal code
- 23: country
- 24: promotion ids
- 25: B2B
- 26: fulfillment

---

## P&L Engine

File: `lib/pl-engine/compute.ts`

```typescript
grossProfit = productSales - |FBA fees| - |referral fees| - TCS(CGST+SGST+IGST) - |TDS|
netProfit = grossProfit - COGS - PPCSpend  // COGS not yet implemented
```

Helper functions: `formatINR(n)`, `formatPercent(n)`, `computePL()`, `computeACoS()`, `computeTACOs()`, `computeROAS()`

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/brands` | GET | List brands for current user's agency |
| `/api/brands` | POST | Create brand (name required) |
| `/api/brands/[id]/upload` | POST | Parse XLSX + batch insert settlements |

All routes:
1. Check Supabase auth (redirect 401 if not logged in)
2. Use the user SSR client (RLS enforced) — not service role

---

## Environment Variables Status

```
NEXT_PUBLIC_SUPABASE_URL      ✅ Set
NEXT_PUBLIC_SUPABASE_ANON_KEY ✅ Set
SUPABASE_SERVICE_ROLE_KEY     ✅ Set
SP_CLIENT_ID                  ⏳ Pending SP-API approval
SP_CLIENT_SECRET              ⏳ Pending
SP_AWS_ACCESS_KEY             ⏳ Pending
SP_AWS_SECRET_KEY             ⏳ Pending
SP_AWS_REGION                 eu-west-1 (set)
ANTHROPIC_API_KEY             ⏳ Not yet added
INNGEST_EVENT_KEY             ⏳ Not yet configured
INNGEST_SIGNING_KEY           ⏳ Not yet configured
WATI_TOKEN                    ⏳ Not yet configured
WATI_BASE_URL                 ⏳ Not yet configured
RESEND_API_KEY                ⏳ Not yet configured
NEXT_PUBLIC_APP_URL           http://localhost:3000
```

---

## Connected MCPs

- **Supabase MCP** — can execute SQL, apply migrations, inspect schema directly
- **Figma MCP** — connected (for future UI design work)

---

## Amazon SP-API

- Registered via Solution Provider Portal (public developer, no seller account needed)
- Udyam MSME registration used for identity verification
- **Status:** Identity verification submitted 17 June 2026, pending review
- Marketplace: `A21TJRUUN4KGV` (Amazon India)
- Region endpoint: `eu-west-1`

---

## What's Next (Day 4)

1. `products` table — COGS entry form per brand
2. Net profit = gross profit − COGS
3. Update brand dashboard to show net profit and net margin
4. Amber warning if any product has no COGS entered
5. Daily metrics rollup into `daily_metrics` table
