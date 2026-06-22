# Day 4 SDD Progress

Task 1: complete — DB constraint UNIQUE(brand_id,sku) applied via Supabase MCP migration
Task 2: complete — GET /api/brands/[id]/products route + get_brand_skus_with_cogs RPC + types updated
Task 3: complete — POST /api/products upsert COGS route
Task 4: complete — ProductsCOGSTable client component with optimistic updates
Task 5: complete — brand page updated, 6-card KPI strip + COGS table

Note: git commits skipped (sandbox permission boundary on host .git). User must commit from Mac terminal.

# Day 5 SDD Progress

Task 1: complete — lib/parsers/ppc.ts created, tsc clean
Task 2: complete — upload route extended (PPC parse + DELETE + insert), upload page shows ppc_campaigns, tsc clean
Task 3: complete — AdvertisingKPIs server component created, tsc clean
Task 4: complete — brand page restructured (advertising top, P&L below, net profit = gross - COGS - PPC), tsc clean
Task 5: complete — AGENTS.md + docs/04_project_plan.md updated (Day 5 marked complete)

Note: git commits to be done by user from Mac terminal.
Task 1: complete — DateFilterBar created, tsc clean, review approved
Task 2: complete — DailySalesChart, OrganicVsPPCChart, ACOSTrendChart, SpendVsSalesChart, tsc clean, review approved
Task 3: complete — ProductTable with SkuRow named export, sortable, totals footer, tsc clean, review approved
Task 4: complete — brand page replaced (searchParams, date filter, chart aggregation, all components wired), tsc clean, review approved. Minor: isoWeek year-boundary edge case; transaction_date no null guard.
Task 5: complete — AGENTS.md updated (What's Built Day 6, What's Next Day 7+), docs/04_project_plan.md Day 6 section marked complete + daily log added
Final review: clean (ready to merge). isoWeek UTC/local fix applied. Minor: SortIcon nested component pattern, transaction_date null guard. Trivial: ACOSTrendChart ternary after filter.
