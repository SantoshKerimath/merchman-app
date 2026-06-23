import PptxGenJS from 'pptxgenjs'
import { createServiceClient } from '@/lib/supabase/server'

interface Slide {
  heading: string
  body?: string
  bullets?: string[]
}

export async function buildPpt(
  sessionId: string,
  filename: string,
  title: string,
  slides: Slide[]
): Promise<{ url: string; filename: string }> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: '1E2761' }
  titleSlide.addText(title, {
    x: 0.5,
    y: 1.5,
    w: '90%',
    h: 2,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  })

  // Content slides
  for (const slide of slides) {
    const s = pptx.addSlide()
    s.addText(slide.heading, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '1E2761',
    })
    if (slide.body) {
      s.addText(slide.body, {
        x: 0.5,
        y: 1.3,
        w: '90%',
        h: 1.2,
        fontSize: 14,
        color: '374151',
      })
    }
    if (slide.bullets?.length) {
      const bulletItems = slide.bullets.map((b) => ({
        text: b,
        options: { bullet: true },
      }))
      s.addText(bulletItems, {
        x: 0.5,
        y: slide.body ? 2.8 : 1.3,
        w: '90%',
        h: 3,
        fontSize: 14,
        color: '374151',
      })
    }
  }

  const buffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer
  const safeFilename = filename.endsWith('.pptx') ? filename : `${filename}.pptx`
  const path = `${sessionId}/${Date.now()}-${safeFilename}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('chat-exports')
    .upload(path, Buffer.from(buffer), {
      contentType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: signed } = await supabase.storage
    .from('chat-exports')
    .createSignedUrl(path, 3600)

  if (!signed?.signedUrl) throw new Error('Failed to create signed URL')

  return { url: signed.signedUrl, filename: safeFilename }
}
