import { createServiceClient } from '@/lib/supabase/server'

export interface SqlSuccess {
  rows: unknown[]
}

export interface SqlError {
  error: string
}

export type SqlResult = SqlSuccess | SqlError

export async function runSql(query: string): Promise<SqlResult> {
  const trimmed = query.trim()

  // Client-side pre-validation (belt + suspenders before DB-level check)
  if (!/^SELECT\s/i.test(trimmed)) {
    return { error: 'Only SELECT queries are allowed' }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('execute_chat_query', { query: trimmed })

  if (error) {
    return { error: error.message }
  }

  const rows = (data as unknown[]) ?? []
  return { rows }
}
