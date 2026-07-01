'use client'

import { ReactNode } from 'react'
import { useChatContext } from './ChatContext'
import ChatSidebar from './ChatSidebar'

export default function ChatAwareLayout({ children }: { children: ReactNode }) {
  const { open } = useChatContext()

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Main content — shrinks to 60% when chat open */}
      <main
        className={`overflow-y-auto bg-surface-page transition-all duration-300 ${
          open ? 'w-[60%]' : 'flex-1'
        }`}
      >
        {children}
      </main>

      {/* Chat panel — inline 40%, slides in */}
      {open && <ChatSidebar />}
    </div>
  )
}
