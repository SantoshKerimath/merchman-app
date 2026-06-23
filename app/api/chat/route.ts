import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt, BrandContext } from '@/lib/chat/system-prompt'
import { TOOL_DEFINITIONS } from '@/lib/chat/tools'
import { runSql } from '@/lib/chat/run-sql'
import { exportXlsx } from '@/lib/chat/export-xlsx'
import { buildPpt } from '@/lib/chat/build-ppt'
import { analyzeWithGemini } from '@/lib/chat/gemini'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

interface UploadedAttachment {
  url: string | null
  filename: string
  ext: string
  extracted_text: string
  is_image: boolean
  media_type: string
}

/** Build user message content — plain string or multi-content block with images */
function buildUserContent(
  message: string,
  attachments: UploadedAttachment[]
): Anthropic.MessageParam['content'] {
  const textAttachments = attachments.filter((a) => !a.is_image)
  const imageAttachments = attachments.filter((a) => a.is_image)

  const textParts = [message]
  textAttachments.forEach((a) => {
    textParts.push(`\n\n[Attached file: ${a.filename}]\n${a.extracted_text}`)
  })
  const fullText = textParts.join('')

  if (imageAttachments.length === 0) return fullText

  const blocks: Anthropic.ContentBlockParam[] = imageAttachments.map((a) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: (a.media_type || 'image/png') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp',
      data: a.extracted_text,
    },
  }))
  blocks.push({ type: 'text' as const, text: fullText })
  return blocks
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(sse(data)))
      }

      try {
        // Auth
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          send({ type: 'error', message: 'Unauthorized' })
          controller.close()
          return
        }

        const body = (await request.json()) as {
          session_id: string | null
          message: string
          brand_id?: string
          date_from?: string
          date_to?: string
          extra_tags?: string[]
          attachments?: UploadedAttachment[]
        }

        const serviceClient = createServiceClient()

        // Create or get session
        let sessionId = body.session_id
        if (!sessionId) {
          const { data: session, error: sessionError } = await serviceClient
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              brand_id: body.brand_id ?? null,
              title: body.message.slice(0, 60),
            })
            .select('id')
            .single()
          if (sessionError || !session) {
            send({ type: 'error', message: 'Failed to create session' })
            controller.close()
            return
          }
          sessionId = session.id
        }

        // Save user message
        await serviceClient.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: body.message,
        })

        // Load last 20 messages for context
        const { data: historyRows } = await serviceClient
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(20)

        const history = (historyRows ?? []) as { role: string; content: string }[]

        // Build Anthropic messages
        const attachments = body.attachments ?? []
        const messages: Anthropic.MessageParam[] = history.map((h, i) => {
          const isCurrentUserMsg =
            h.role === 'user' && i === history.length - 1 && attachments.length > 0
          return {
            role: h.role === 'user' ? 'user' : 'assistant',
            content: isCurrentUserMsg
              ? buildUserContent(h.content, attachments)
              : h.content,
          }
        })

        // Brand context for system prompt
        let brandCtx: BrandContext | undefined = undefined
        if (body.brand_id) {
          const { data: brand } = await serviceClient
            .from('brands')
            .select('name')
            .eq('id', body.brand_id)
            .single()
          const { data: cred } = await serviceClient
            .from('brand_credentials')
            .select('last_sync_at')
            .eq('brand_id', body.brand_id)
            .single()
          if (brand) {
            brandCtx = {
              name: brand.name,
              brandId: body.brand_id,
              lastSyncAt: (cred as { last_sync_at?: string } | null)?.last_sync_at ?? null,
              dateFrom: body.date_from,
              dateTo: body.date_to,
              extraTags: body.extra_tags,
            }
          }
        }

        // Tool loop
        let totalInputTokens = 0
        let totalOutputTokens = 0
        let assistantContent = ''
        let loopMessages = [...messages]
        let continueLoop = true

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: buildSystemPrompt(brandCtx),
            tools: TOOL_DEFINITIONS,
            messages: loopMessages,
          })

          totalInputTokens += response.usage.input_tokens
          totalOutputTokens += response.usage.output_tokens

          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type === 'text') {
              assistantContent += block.text
              send({ type: 'text', delta: block.text })
            } else if (block.type === 'tool_use') {
              send({ type: 'tool_start', tool: block.name, input: block.input })

              let toolResultContent: string
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const input = block.input as any

              if (block.name === 'run_sql') {
                const result = await runSql(input.query as string)
                send({ type: 'tool_result', tool: 'run_sql', result })
                toolResultContent = JSON.stringify(result)
              } else if (block.name === 'generate_chart') {
                send({ type: 'chart', config: input })
                toolResultContent = JSON.stringify({ success: true, message: 'Chart rendered on client' })
              } else if (block.name === 'export_xlsx') {
                try {
                  const result = await exportXlsx(sessionId!, input.filename, input.sheets)
                  send({ type: 'file', url: result.url, filename: result.filename, ext: 'xlsx' })
                  toolResultContent = JSON.stringify(result)
                } catch (e) {
                  toolResultContent = JSON.stringify({ error: String(e) })
                }
              } else if (block.name === 'build_ppt') {
                try {
                  const result = await buildPpt(sessionId!, input.filename, input.title, input.slides)
                  send({ type: 'file', url: result.url, filename: result.filename, ext: 'pptx' })
                  toolResultContent = JSON.stringify(result)
                } catch (e) {
                  toolResultContent = JSON.stringify({ error: String(e) })
                }
              } else if (block.name === 'analyze_with_gemini') {
                try {
                  const text = await analyzeWithGemini(input.prompt, input.context)
                  toolResultContent = text
                } catch (e) {
                  toolResultContent = JSON.stringify({ error: String(e) })
                }
              } else {
                toolResultContent = JSON.stringify({ error: `Unknown tool: ${block.name}` })
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: toolResultContent,
              })
            }
          }

          loopMessages.push({ role: 'assistant', content: response.content })

          if (response.stop_reason === 'tool_use' && toolResults.length > 0) {
            loopMessages.push({ role: 'user', content: toolResults })
          } else {
            continueLoop = false
          }
        }

        // Save assistant message
        if (assistantContent) {
          await serviceClient.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: assistantContent,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          })
        }

        // Update session token totals
        await serviceClient
          .from('chat_sessions')
          .update({
            total_input_tokens: totalInputTokens,
            total_output_tokens: totalOutputTokens,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)

        send({
          type: 'done',
          session_id: sessionId,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(sse({ type: 'error', message: msg })))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
