import * as XLSX from 'xlsx'
import { createServiceClient } from '@/lib/supabase/server'

interface Sheet {
  name: string
  headers: string[]
  rows: unknown[][]
}

export async function exportXlsx(
  sessionId: string,
  filename: string,
  sheets: Sheet[]
): Promise<{ url: string; filename: string }> {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows])
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  const path = `${sessionId}/${Date.now()}-${safeFilename}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('chat-exports')
    .upload(path, buffer, {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: signed } = await supabase.storage
    .from('chat-exports')
    .createSignedUrl(path, 3600)

  if (!signed?.signedUrl) throw new Error('Failed to create signed URL')

  return { url: signed.signedUrl, filename: safeFilename }
}
