import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseSettlementRows } from '@/lib/parsers/settlement'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name')
    .eq('id', brandId)
    .single()

  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let rawRows: unknown[][] = []

  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    const sheetName = workbook.SheetNames.find(n =>
      n.toLowerCase().includes('sales') || n.toLowerCase().includes('settlement')
    ) ?? workbook.SheetNames[0]

    const sheet = workbook.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    }) as unknown[][]

    let dataStartRow = 0
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      const row = allRows[i]
      const rowStr = row.join(' ').toLowerCase()
      if (rowStr.includes('date/time') || rowStr.includes('settlement id')) {
        dataStartRow = i + 1
        break
      }
    }

    rawRows = allRows.slice(dataStartRow)
  } catch {
    const text = new TextDecoder().decode(buffer)
    const lines = text.split('\n').slice(1)
    rawRows = lines.map(line => line.split('\t'))
  }

  const { rows, skipped, errors } = parseSettlementRows(rawRows)

  if (rows.length === 0) {
    return NextResponse.json({
      error: 'No valid rows found. Make sure you uploaded the Sales Database sheet.',
      skipped,
      errors: errors.slice(0, 5),
    }, { status: 400 })
  }

  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
    const { error } = await supabase.from('settlements').insert(chunk)
    if (error) {
      return NextResponse.json({
        error: `Insert failed at row ${i}: ${error.message}`,
        inserted,
      }, { status: 500 })
    }
    inserted += chunk.length
  }

  return NextResponse.json({
    success: true,
    inserted,
    skipped,
    errors: errors.slice(0, 5),
    brand: brand.name,
  })
}
