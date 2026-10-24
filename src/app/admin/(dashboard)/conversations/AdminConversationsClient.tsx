'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  User,
  Phone,
  FileText,
  RefreshCw,
  Inbox,
} from 'lucide-react'
import {
  ConversationInboxItem,
  getAdminConversationInboxAction,
} from '@/app/invoice/conversation-actions'
import AdminInvoiceConversation from '../invoices/[id]/AdminInvoiceConversation'

export default function AdminConversationsClient({
  initialConversations,
}: {
  initialConversations: ConversationInboxItem[]
}) {
  const [conversations, setConversations] = useState<ConversationInboxItem[]>(initialConversations)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].invoiceId : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const res = await getAdminConversationInboxAction()
    if (res.success && res.data) {
      setConversations(res.data)
      if (!selectedInvoiceId && res.data.length > 0) {
        setSelectedInvoiceId(res.data[0].invoiceId)
      }
    }
    setIsRefreshing(false)
  }

  const handleMessagesRead = (invoiceId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.invoiceId === invoiceId ? { ...c, unreadCount: 0 } : c
      )
    )
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    // Instantly clear unread badge for the selected conversation in the UI
    setConversations((prev) =>
      prev.map((c) =>
        c.invoiceId === invoiceId ? { ...c, unreadCount: 0 } : c
      )
    )
  }

  // Periodic polling for new messages in inbox
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getAdminConversationInboxAction()
      if (res.success && res.data) {
        setConversations(res.data)
      }
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  const filteredConversations = conversations.filter((item) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      item.invoiceNumber.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.customerPhone.toLowerCase().includes(q) ||
      item.latestMessage.toLowerCase().includes(q)
    )
  })

  const selectedConversation = conversations.find(
    (c) => c.invoiceId === selectedInvoiceId
  )

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0)

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-950 tracking-tight">
              Customer Conversations
            </h2>
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {totalUnread} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Private discussions initiated by collectors from their secure public invoice links.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Checking...' : 'Refresh Inbox'}</span>
        </button>
      </div>

      {/* Main Inbox Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversation Thread List */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col h-[700px]">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice #, collector, or text..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-black outline-none transition-colors"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400 space-y-2">
                <Inbox className="w-8 h-8 stroke-1 text-gray-300" />
                <p className="text-xs font-semibold text-gray-600">No conversations found</p>
                <p className="text-[11px] text-gray-400">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'When collectors send questions on their invoice, messages will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((item) => {
                const isSelected = item.invoiceId === selectedInvoiceId
                return (
                  <button
                    key={item.invoiceId}
                    type="button"
                    onClick={() => handleSelectInvoice(item.invoiceId)}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/60 border-l-4 border-amber-600'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900">
                          {item.invoiceNumber}
                        </span>
                        {item.unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                            {item.unreadCount} new
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(item.latestMessageAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800 truncate max-w-[200px]">
                        {item.customerName}
                      </span>
                      <span className="font-mono text-[11px] text-gray-500 font-light">
                        ৳{item.totalAmount.toLocaleString('en-BD')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      <span className="font-semibold text-gray-500">
                        {item.latestSenderType === 'admin' ? 'You: ' : ''}
                      </span>
                      {item.latestMessage}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Thread Messages & Reply Composer */}
        <div className="lg:col-span-7">
          {selectedConversation ? (
            <div className="space-y-4">
              {/* Context Summary Bar */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      {selectedConversation.invoiceNumber}
                    </h3>
                    <span className="text-xs text-gray-400">&bull;</span>
                    <span className="text-xs font-medium text-gray-700">
                      {selectedConversation.customerName}
                    </span>
                    {selectedConversation.customerPhone && (
                      <span className="text-xs text-gray-400 font-mono">
                        ({selectedConversation.customerPhone})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Amount: ৳{selectedConversation.totalAmount.toLocaleString('en-BD')} &bull; Status: {selectedConversation.paymentStatus}
                  </p>
                </div>

                <Link
                  href={`/admin/invoices/${selectedConversation.invoiceId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Full Invoice</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Thread Component */}
              <AdminInvoiceConversation
                key={selectedConversation.invoiceId}
                invoiceId={selectedConversation.invoiceId}
                customerName={selectedConversation.customerName}
                onMessagesRead={handleMessagesRead}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center text-gray-400 flex flex-col items-center justify-center h-[500px] space-y-3">
              <MessageSquare className="w-10 h-10 stroke-1 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No conversation selected</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Select a conversation thread from the left to read messages and reply to the collector.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
