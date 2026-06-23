'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    const msg = value.trim()
    if (!msg || disabled) return
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(msg)
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

  return (
    <div className="border-t border-slate-200 p-3 bg-white">
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
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
        <button
          onClick={send}
          disabled={!value.trim() || disabled}
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
      <p className="text-xs text-slate-400 mt-1 px-1">Enter to send · Shift+Enter for newline</p>
    </div>
  )
}
