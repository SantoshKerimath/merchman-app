import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const TEXT_EXTS = ['csv', 'txt', 'md']
const SPREADSHEET_EXTS = ['xlsx', 'xls']
const OFFICE_EXTS = ['pptx', 'docx', 'pdf']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const sessionId = formData.get('session_id') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const buffer = Buffer.from(await file.arrayBuffer())
  const serviceClient = createServiceClient()

  // Upload to Supabase Storage
  const storagePath = `${sessionId ?? user.id}/${Date.now()}-${file.name}`
  const { error: uploadError } = await serviceClient.storage
    .from('chat-uploads')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  let signedUrl: string | null = null
  if (!uploadError) {
    const { data: urlData } = await serviceClient.storage
      .from('chat-uploads')
      .createSignedUrl(storagePath, 3600)
    signedUrl = urlData?.signedUrl ?? null
  }

  // Extract text content
  let extractedText = ''
  let isImage = false

  try {
    if (IMAGE_EXTS.includes(ext)) {
      isImage = true
      extractedText = buffer.toString('base64')
    } else if (TEXT_EXTS.includes(ext)) {
      extractedText = buffer.toString('utf-8')
    } else if (SPREADSHEET_EXTS.includes(ext)) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const parts: string[] = []
      wb.SheetNames.forEach((name) => {
        parts.push(`[Sheet: ${name}]`)
        parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[name]))
      })
      extractedText = parts.join('\n\n')
    } else if (OFFICE_EXTS.includes(ext)) {
      // Requires: npm install officeparser
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const officeParser = require('officeparser')
        extractedText = await officeParser.parseOfficeAsync(buffer)
      } catch {
        extractedText = `[Text extraction unavailable for ${file.name}. Run: npm install officeparser]`
      }
    } else {
      extractedText = `[Unsupported file type: .${ext}]`
    }
  } catch (err) {
    extractedText = `[Extraction failed: ${err instanceof Error ? err.message : String(err)}]`
  }

  return NextResponse.json({
    url: signedUrl,
    filename: file.name,
    ext,
    extracted_text: extractedText,
    is_image: isImage,
    media_type: file.type,
  })
}
