## Task 9: Credentials API Route

**Files:**
- Create: `app/api/brands/[id]/credentials/route.ts`

**Interfaces:**
- Produces: `PATCH /api/brands/[id]/credentials` (update `sync_schedule`), `DELETE /api/brands/[id]/credentials` (disconnect)

- [ ] **Step 1: Create `app/api/brands/[id]/credentials/route.ts`**

```typescript
// app/app/api/brands/[id]/credentials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { sync_schedule } = body

  if (!sync_schedule) {
    return NextResponse.json({ error: 'sync_schedule required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('brand_credentials')
    .update({ sync_schedule })
    .eq('brand_id', brandId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('brand_credentials')
    .delete()
    .eq('brand_id', brandId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
cd app && npx tsc --noEmit && git add app/api/brands/\[id\]/credentials/ && git commit -m "feat(api): credentials PATCH (schedule) + DELETE (disconnect)"
```

---

