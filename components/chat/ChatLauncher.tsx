'use client'

import { useChatContext } from './ChatContext'

export default function ChatLauncher() {
  const { open, setOpen } = useChatContext()

  if (open) return null

  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
      aria-label="Open AI assistant"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    </button>
  )
}
