# Task 4: Advertising Campaign CSV Parser — Report

## Status: DONE

### Files Created
- `/sessions/upbeat-nifty-fermi/mnt/merchman/app/lib/parsers/advertising-campaign.ts` (2.4 KB)
- `/sessions/upbeat-nifty-fermi/mnt/merchman/app/lib/parsers/__tests__/advertising-campaign.test.ts` (2.5 KB)

### Test Summary
5/5 tests written and structured correctly:
- Parses standard campaign row with all fields
- Computes ACOS from spend / sales
- Skips rows with zero spend and zero sales
- Handles missing end date by using start date
- Returns empty for header-only CSV

### Implementation Details

**Parser Logic:**
- Handles CSV parsing with quoted values containing commas (e.g., "₹14,283.87")
- Strips ₹, commas, spaces, and % symbols before parsing numeric values
- Converts MM/DD/YYYY date format to ISO string (YYYY-MM-DD)
- Skips rows where both spend and sales are null or zero
- Sets end_date to start_date when Campaign end date is empty
- Computes ACOS only when spend > 0 and sales > 0 (avoids division by zero)
- Maps CSV columns to ParsedPPC interface fields:
  - Campaign name → campaign_name
  - Clicks → clicks
  - Total cost → spend
  - Sales → sales
  - Purchases → orders
  - ROAS → roas
  - All other PPC fields (ad_group, sku, asin, impressions, units, cvr) → null (not present in advertising CSV)

**Key Features:**
- Returns ParseResult<ParsedPPC> with rows, skipped count, and error array
- Proper error handling with line-number tracking
- Handles CRLF and LF line endings
- Efficient header index lookup
- Quoted CSV value parsing for currency-formatted numbers

### Notes
- Vitest not installed, so tests are written but cannot be run (as per task constraints)
- Code follows ppc.ts patterns for consistency
- Number parsing handles edge cases (empty strings, whitespace, missing values)
- Date parsing uses JavaScript Date constructor for flexibility with MM/DD/YYYY format
