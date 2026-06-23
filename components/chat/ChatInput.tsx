'use client'

import { useState, useRef, KeyboardEvent } from 'react'

export interface FileAttachment {
  id: string
  file: File
}

const ACCEPTED = '.pdf,.pptx,.docx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp'

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (ext === 'pptx') return '📊'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📈'
  if (ext === 'docx') return '📝'
  return '📎'
}

interface Props {
  onSend: (message: string, attachments: FileAttachment[]) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const send = () => {
    if ((!value.trim() && attachments.length === 0) || disabled) return
    onSend(value.trim(), attachments)
    setValue('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ id: `${Date.now()}-${f.name}`, file: f })),
    ])
    e.target.value = ''
  }

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id))

  return (
    <div className="border-t border-slate-200 p-3 bg-white">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-lg px-2 py-1 max-w-[180px]"
            >
              <span className="flex-shrink-0">{fileIcon(a.file.name)}</span>
              <span className="truncate">{a.file.name}</span>
              <button
                onClick={() => removeAttachment(a.id)}
                className="opacity-50 hover:opacity-100 flex-shrink-0 leading-none ml-0.5"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        {/* Paperclip */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach file (PDF, PPTX, DOCX, XLSX, CSV, image)"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={onInput}
          placeholder="Ask about your data..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none max-h-40 overflow-y-auto"
        />

        {/* Send */}
        <button
          onClick={send}
          disabled={(!value.trim() && attachments.length === 0) || disabled}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-500 disabled:bg-slate-200 hover:bg-teal-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-1 px-1">
        Enter to send · Shift+Enter for newline · 📎 to attach files
      </p>
    </div>
  )
}
