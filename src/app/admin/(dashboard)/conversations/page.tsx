import { requireAdmin } from '@/utils/supabase/admin-auth'
import { getAdminConversationInboxAction } from '@/app/invoice/conversation-actions'
import AdminConversationsClient from './AdminConversationsClient'

export const metadata = {
  title: 'Customer Conversations | Kazi Canvas Gallery',
}

export const revalidate = 0

export default async function AdminConversationsPage() {
  await requireAdmin()
  const res = await getAdminConversationInboxAction()
  const initialConversations = res.success && res.data ? res.data : []

  return <AdminConversationsClient initialConversations={initialConversations} />
}
