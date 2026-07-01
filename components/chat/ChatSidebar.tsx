'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useChatContext } from './ChatContext'
import SessionList from './SessionList'
import ChatMessage, { Message, EmailDraft } from './ChatMessage'
import ChatInput, { FileAttachment } from './ChatInput'
import { ChartConfig } from './ChatChart'

// ─── Context tag types ────────────────────────────────────────────────────────

interface ContextTag {
  id: string
  label: string
  type: 'brand' | 'date' | 'custom'
  // Underlying values passed to API
  brandId?: string
  dateFrom?: string
  dateTo?: string
}

// ─── SSE event type ───────────────────────────────────────────────────────────

interface SSEEvent {
  type: 'text' | 'tool_start' | 'tool_result' | 'chart' | 'file' | 'email' | 'done' | 'error'
  delta?: string
  tool?: string
  input?: unknown
  result?: unknown
  config?: ChartConfig
  url?: string
  filename?: string
  ext?: string
  // email fields
  subject?: string
  to?: string
  body?: string
  tone?: string
  session_id?: string
  input_tokens?: number
  output_tokens?: number
  message?: string
}

// ─── Format date for display (16 Jun) ────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatSidebar() {
  const { setOpen, activeSessionId, setActiveSessionId } = useChatContext()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [contextTags, setContextTags] = useState<ContextTag[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const addTagInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect context from URL on mount / navigation change
  useEffect(() => {
    const brandMatch = pathname.match(/\/brands\/([0-9a-f-]{36})/i)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const newTags: ContextTag[] = []

    if (brandMatch) {
      const brandId = brandMatch[1]
      // Fetch brand name
      fetch(`/api/brands/${brandId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data: { name?: string } | null) => {
          const label = data?.name ?? 'Brand'
          setContextTags((prev) => {
            // Replace existing brand/date tags, keep custom
            const custom = prev.filter((t) => t.type === 'custom')
            const tags: ContextTag[] = [
              { id: 'brand', label, type: 'brand', brandId },
            ]
            if (from && to) {
              tags.push({
                id: 'date',
                label: `${fmtDate(from)} – ${fmtDate(to)}`,
                type: 'date',
                dateFrom: from,
                dateTo: to,
              })
            }
            return [...tags, ...custom]
          })
        })
        .catch(() => {})
    } else {
      // Not on a brand page — clear brand/date tags
      setContextTags((prev) => prev.filter((t) => t.type === 'custom'))
    }

    return () => { newTags.length = 0 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()])

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
      return
    }
    fetch(`/api/chat/sessions/${activeSessionId}/messages`)
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then(({ messages: rows }: { messages: Array<{ id: string; role: string; content: string }> }) => {
        setMessages(
          rows
            .filter((r) => r.role === 'user' || r.role === 'assistant')
            .map((r) => ({ id: r.id, role: r.role as 'user' | 'assistant', content: r.content }))
        )
      })
      .catch(() => {})
  }, [activeSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (addingTag) addTagInputRef.current?.focus()
  }, [addingTag])

  const removeTag = (id: string) => setContextTags((prev) => prev.filter((t) => t.id !== id))

  const addCustomTag = () => {
    const val = newTagValue.trim()
    if (!val) { setAddingTag(false); return }
    setContextTags((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: val, type: 'custom' },
    ])
    setNewTagValue('')
    setAddingTag(false)
  }

  // Derive context for API from current tags
  const buildContextFromTags = () => {
    const brandTag = contextTags.find((t) => t.type === 'brand')
    const dateTag = contextTags.find((t) => t.type === 'date')
    const customTags = contextTags.filter((t) => t.type === 'custom').map((t) => t.label)
    return {
      brand_id: brandTag?.brandId,
      date_from: dateTag?.dateFrom,
      date_to: dateTag?.dateTo,
      extra_tags: customTags.length ? customTags : undefined,
    }
  }

  const sendMessage = useCallback(
    async (text: string, fileAttachments: FileAttachment[] = []) => {
      // Show attachment names inline in user bubble
      const userDisplayContent = [
        text,
        ...fileAttachments.map((a) => `📎 ${a.file.name}`),
      ]
        .filter(Boolean)
        .join('\n')

      const userMsg: Message = { id: `temp-${Date.now()}`, role: 'user', content: userDisplayContent }
      const assistantMsgId = `stream-${Date.now()}`
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        streaming: true,
        charts: [],
        files: [],
        emails: [],
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)

      const ctx = buildContextFromTags()

      // Upload attachments before sending
      let uploadedAttachments: unknown[] = []
      if (fileAttachments.length > 0) {
        uploadedAttachments = await Promise.all(
          fileAttachments.map(async (a) => {
            const fd = new FormData()
            fd.append('file', a.file)
            if (activeSessionId) fd.append('session_id', activeSessionId)
            try {
              const r = await fetch('/api/chat/upload', { method: 'POST', body: fd })
              return r.ok ? await r.json() : null
            } catch {
              return null
            }
          })
        )
        uploadedAttachments = uploadedAttachments.filter(Boolean)
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionId,
            message: text,
            attachments: uploadedAttachments.length ? uploadedAttachments : undefined,
            ...ctx,
          }),
        })

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: 'Error connecting to assistant.', streaming: false } : m
            )
          )
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent
              // Capture session_id outside the updater to avoid setState-in-render
              let pendingSessionId: string | null = null
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsgId) return m
                  switch (event.type) {
                    case 'text':
                      return { ...m, content: m.content + (event.delta ?? '') }
                    case 'chart':
                      return { ...m, charts: [...(m.charts ?? []), event.config!] }
                    case 'file':
                      return {
                        ...m,
                        files: [...(m.files ?? []), { url: event.url!, filename: event.filename!, ext: event.ext! }],
                      }
                    case 'email': {
                      const draft: EmailDraft = {
                        subject: event.subject ?? '',
                        to: event.to ?? '',
                        body: event.body ?? '',
                        tone: event.tone,
                      }
                      return { ...m, emails: [...(m.emails ?? []), draft] }
                    }
                    case 'done':
                      if (event.session_id && !activeSessionId) pendingSessionId = event.session_id
                      return { ...m, streaming: false }
                    case 'error':
                      return { ...m, content: m.content || `Error: ${event.message}`, streaming: false }
                    default:
                      return m
                  }
                })
              )
              if (pendingSessionId) setActiveSessionId(pendingSessionId)
            } catch { /* malformed */ }
          }
        }
      } finally {
        setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, streaming: false } : m)))
        setStreaming(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSessionId, setActiveSessionId, contextTags, buildContextFromTags]
  )

  return (
    <div className="w-[40%] flex-shrink-0 h-full flex flex-col border-l border-border-default bg-surface-card shadow-[-4px_0_24px_rgba(0,0,0,0.06)]">
      {/* ── Left panel: sessions ── */}
      <div className="flex h-full">
        <SessionList />

        {/* ── Right: chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default bg-surface-card">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span className="text-sm font-semibold text-text-primary">MerchMan AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-raised transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Context tags bar */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border-subtle bg-surface-raised min-h-[40px]">
            {contextTags.map((tag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  tag.type === 'brand'
                    ? 'bg-surface-sidebar/10 text-surface-sidebar'
                    : tag.type === 'date'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'bg-surface-raised text-text-secondary'
                }`}
              >
                {tag.label}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="opacity-60 hover:opacity-100 leading-none"
                  aria-label={`Remove ${tag.label}`}
                >
                  ×
                </button>
              </span>
            ))}

            {/* Add tag input */}
            {addingTag ? (
              <input
                ref={addTagInputRef}
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomTag()
                  if (e.key === 'Escape') { setAddingTag(false); setNewTagValue('') }
                }}
                onBlur={addCustomTag}
                placeholder="Add context…"
                className="text-xs border border-border-default rounded-full px-2 py-0.5 outline-none focus:border-accent-primary w-28 bg-surface-card"
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="text-xs text-text-muted hover:text-accent-primary transition-colors px-1"
              >
                + Add context
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="text-center mt-12 text-text-muted">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-sm font-medium text-text-secondary">Ask anything about your data</p>
                <p className="text-xs mt-1">
                  {contextTags.length > 0
                    ? `Context: ${contextTags.map((t) => t.label).join(', ')}`
                    : 'Navigate to a brand page to auto-set context'}
                </p>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={streaming} />
        </div>
      </div>
    </div>
  )
}
