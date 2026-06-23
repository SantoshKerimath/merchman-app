import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import AlertToast from '@/components/alerts/AlertToast'
import { ChatProvider } from '@/components/chat/ChatContext'
import ChatLauncher from '@/components/chat/ChatLauncher'
import ChatAwareLayout from '@/components/chat/ChatAwareLayout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <ChatProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <ChatAwareLayout>
          {children}
        </ChatAwareLayout>
        <AlertToast />
        <ChatLauncher />
      </div>
    </ChatProvider>
  )
}
