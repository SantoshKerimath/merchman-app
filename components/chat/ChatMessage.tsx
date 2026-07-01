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
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-surface-raised border-b border-border-default px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-text-muted truncate">To: {email.to}</p>
          <p className="font-semibold text-text-primary truncate">{email.subject}</p>
        </div>
        <button
          onClick={copy}
          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg border border-border-default text-text-secondary hover:bg-surface-raised transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Body */}
      <div className="px-3 py-2.5 prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
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
          <div className="bg-accent-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            {message.content && (
              <div className="bg-surface-card border border-border-default rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text-primary prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.streaming && (
                  <span className="inline-block w-1 h-4 bg-accent-primary ml-0.5 animate-pulse" />
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
                className="flex items-center gap-2 bg-surface-card border border-border-default rounded-xl px-3 py-2 text-sm text-accent-primary hover:bg-accent-primary/10 transition-colors"
              >
                <span>{file.ext === 'xlsx' ? '📊' : '📑'}</span>
                <span className="font-medium">{file.filename}</span>
                <span className="text-xs text-text-muted ml-auto">Download</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
