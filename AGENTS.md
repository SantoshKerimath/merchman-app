# MerchMan — Agent Context

> Source of truth for AI agents. Read before writing code.

---

## What This Is

MerchMan: AI-powered Amazon merchant analytics SaaS for Indian brand agencies. Pilot client: **Growz Scalers** (brands: Cadlec, Kridlo, TinyLane).

**Builder:** Santosh Kerimath (kerimathsantosh@gmail.com)
**Started:** 17 Jun 2026 | **Status:** Day 3 complete. Upload → P&L working.

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

## What's Built (21 Jun 2026)

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
| Date range filter | 🔜 Day 6 | — |
| Charts | 🔜 Day 6 | — |
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
- **Status:** Verification submitted 17 Jun 2026, pending review
- Marketplace: `A21TJRUUN4KGV` | Region endpoint: `eu-west-1`

---

## What's Next (Day 6)

Run `brainstorming` + `writing-plans` + `ui-ux-pro-max` skills before coding.

1. Date range picker (7D / 30D / custom) — filter settlements + ppc_data
2. Daily sales line chart (Recharts)
3. Organic vs. PPC stacked bar chart
4. Product breakdown DataTable (sortable: SKU, sales, units, gross profit, ACOS)

**Key context:**
- Brand page is server component — date filter needs searchParams or client wrapper
- `ppc_data` has `start_date` / `end_date` columns (ISO date strings) for filtering
- Advertising strip + P&L strip layout established in Day 5 — charts go below
