'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ChatContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
}

const ChatCtx = createContext<ChatContextValue>({
  open: false,
  setOpen: () => {},
  activeSessionId: null,
  setActiveSessionId: () => {},
})

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  return (
    <ChatCtx.Provider value={{ open, setOpen, activeSessionId, setActiveSessionId }}>
      {children}
    </ChatCtx.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatCtx)
}
