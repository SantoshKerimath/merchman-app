import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseSettlementRows } from '@/lib/parsers/settlement'
import { parsePPCRows } from '@/lib/parsers/ppc'

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

  let settlementRawRows: unknown[][] = []
  let ppcRawRows: unknown[][] = []

  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // --- Settlements ---
    const salesSheet = workbook.SheetNames.find(n =>
      n.toLowerCase().includes('sales') || n.toLowerCase().includes('settlement')
    ) ?? workbook.SheetNames[0]

    const sheet = workbook.Sheets[salesSheet]
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1, defval: null, raw: true,
    }) as unknown[][]

    let dataStartRow = 0
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      const rowStr = allRows[i].join(' ').toLowerCase()
      if (rowStr.includes('date/time') || rowStr.includes('settlement id')) {
        dataStartRow = i + 1
        break
      }
    }
    settlementRawRows = allRows.slice(dataStartRow)

    // --- PPC ---
    const ppcSheetName = workbook.SheetNames.find(n =>
      n.toLowerCase().includes('ppc')
    )
    if (ppcSheetName) {
      const ppcSheet = workbook.Sheets[ppcSheetName]
      const ppcAll = XLSX.utils.sheet_to_json<unknown[]>(ppcSheet, {
        header: 1, defval: null, raw: true,
      }) as unknown[][]
      // Row 0 = title, row 1 = headers, row 2+ = data
      ppcRawRows = ppcAll.slice(2)
    }
  } catch {
    // Fallback: treat as TSV settlement file
    const text = new TextDecoder().decode(buffer)
    settlementRawRows = text.split('\n').slice(1).map(line => line.split('\t'))
  }

  // Parse settlements
  const { rows: settlementRows, skipped, errors } = parseSettlementRows(settlementRawRows)

  if (settlementRows.length === 0) {
    return NextResponse.json({
      error: 'No valid rows found. Make sure you uploaded the correct file.',
      skipped,
      errors: errors.slice(0, 5),
    }, { status: 400 })
  }

  // Insert settlements
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < settlementRows.length; i += CHUNK) {
    const chunk = settlementRows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
    const { error } = await supabase.from('settlements').insert(chunk)
    if (error) {
      return NextResponse.json({
        error: `Settlement insert failed at row ${i}: ${error.message}`,
        inserted,
      }, { status: 500 })
    }
    inserted += chunk.length
  }

  // Insert PPC (delete existing first for idempotency)
  let ppc_campaigns = 0
  if (ppcRawRows.length > 0) {
    const { rows: ppcRows } = parsePPCRows(ppcRawRows)

    if (ppcRows.length > 0) {
      await supabase.from('ppc_data').delete().eq('brand_id', brandId)

      for (let i = 0; i < ppcRows.length; i += CHUNK) {
        const chunk = ppcRows.slice(i, i + CHUNK).map(r => ({ ...r, brand_id: brandId }))
        const { error } = await supabase.from('ppc_data').insert(chunk)
        if (error) {
          console.error('PPC insert error:', error.message)
          break
        }
        ppc_campaigns += chunk.length
      }
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    ppc_campaigns,
    skipped,
    errors: errors.slice(0, 5),
    brand: brand.name,
  })
}
