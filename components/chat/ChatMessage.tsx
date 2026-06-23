'use client'

import ReactMarkdown from 'react-markdown'
import ChatChart, { ChartConfig } from './ChatChart'

interface FileAttachment {
  url: string
  filename: string
  ext: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartConfig[]
  files?: FileAttachment[]
  streaming?: boolean
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {isUser ? (
          <div className="bg-teal-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {message.streaming && (
                <span className="inline-block w-1 h-4 bg-teal-500 ml-0.5 animate-pulse" />
              )}
            </div>
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
