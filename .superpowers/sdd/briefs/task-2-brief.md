## Task 2: Vitest Setup + Parser Test Scaffold

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/parsers/__tests__/settlement-v2.test.ts` (scaffold only — tests fail)

**Interfaces:**
- Produces: `npm test` command that runs `lib/parsers/__tests__/*.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd app && npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// app/vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create failing scaffold test**

```typescript
// app/lib/parsers/__tests__/settlement-v2.test.ts
import { describe, it, expect } from 'vitest'
import { parseSettlementV2 } from '../settlement-v2'

describe('parseSettlementV2', () => {
  it('parses a minimal valid V2 TSV', () => {
    expect(true).toBe(false) // scaffold — will be replaced in Task 3
  })
})
```

- [ ] **Step 5: Run to confirm setup works (test fails as expected)**

```bash
cd app && npm test
```
Expected: 1 test file, 1 failed (`expect(true).toBe(false)`). Vitest exits with code 1 — that's correct.

- [ ] **Step 6: Commit**

```bash
cd app && git add vitest.config.ts lib/parsers/__tests__/settlement-v2.test.ts package.json && git commit -m "chore: add Vitest for parser unit tests"
```

---

