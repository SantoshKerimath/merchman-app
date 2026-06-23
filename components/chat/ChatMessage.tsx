'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import ChatChart, { ChartConfig } from './ChatChart'

interface FileAttachment {
  url: string
  filename: string
  ext: string
}

export interface EmailDraft {
  subject: string
  to: string
  body: string
  tone?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartConfig[]
  files?: FileAttachment[]
  emails?: EmailDraft[]
  streaming?: boolean
}

function EmailCard({ email }: { email: EmailDraft }) {
  const [copied, setCopied] = useState(false)

  const fullText = `To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`

  const copy = async () => {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">To: {email.to}</p>
          <p className="font-semibold text-slate-800 truncate">{email.subject}</p>
        </div>
        <button
          onClick={copy}
          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Body */}
      <div className="px-3 py-2.5 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
        {email.body}
      </div>
    </div>
  )
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {isUser ? (
          <div className="bg-teal-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            {message.content && (
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.streaming && (
                  <span className="inline-block w-1 h-4 bg-teal-500 ml-0.5 animate-pulse" />
                )}
              </div>
            )}
            {message.emails?.map((email, i) => (
              <EmailCard key={i} email={email} />
            ))}
            {message.charts?.map((chart, i) => (
              <ChatChart key={i} config={chart} />
            ))}
            {message.files?.map((file, i) => (
              <a
                key={i}
                href={file.url}
                download={file.filename}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <span>{file.ext === 'xlsx' ? '📊' : '📑'}</span>
                <span className="font-medium">{file.filename}</span>
                <span className="text-xs text-slate-400 ml-auto">Download</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
