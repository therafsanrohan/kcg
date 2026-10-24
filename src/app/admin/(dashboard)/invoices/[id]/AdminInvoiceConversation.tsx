'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Check, ShieldCheck, User } from 'lucide-react'
import {
  InvoiceMessage,
  getAdminInvoiceMessages,
  sendAdminInvoiceMessage,
  markConversationReadAction,
} from '@/app/invoice/conversation-actions'
import { createClient } from '@/utils/supabase/client'

interface AdminInvoiceConversationProps {
  invoiceId: string
  customerName?: string
  onMessagesRead?: (invoiceId: string) => void
}

export default function AdminInvoiceConversation({
  invoiceId,
  customerName = 'Collector',
  onMessagesRead,
}: AdminInvoiceConversationProps) {
  const [messages, setMessages] = useState<InvoiceMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    const res = await getAdminInvoiceMessages(invoiceId)
    if (res.success && res.data) {
      setMessages(res.data)
      // If there are unread customer messages, mark them as read in DB and trigger callback
      const hasUnread = res.data.some((m) => m.sender_type === 'customer' && !m.is_read)
      if (hasUnread) {
        await markConversationReadAction(invoiceId)
        if (onMessagesRead) {
          onMessagesRead(invoiceId)
        }
      }
    }
  }

  useEffect(() => {
    setIsLoading(true)
    loadMessages().finally(() => setIsLoading(false))

    // Realtime channel subscription
    let channel: any = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel(`admin-invoice-${invoiceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'invoice_messages',
            filter: `invoice_id=eq.${invoiceId}`,
          },
          (payload: any) => {
            if (payload?.new) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev
                return [...prev, payload.new as InvoiceMessage]
              })
              // If incoming from customer, mark as read
              if (payload.new.sender_type === 'customer') {
                import('@/app/invoice/conversation-actions').then((mod) => {
                  mod.markConversationReadAction(invoiceId)
                })
              }
            }
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Realtime admin channel error, falling back to polling', e)
    }

    // Polling every 10s for new customer inquiries
    const interval = setInterval(loadMessages, 10000)
    return () => {
      clearInterval(interval)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [invoiceId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)
    setErrorMsg(null)

    const res = await sendAdminInvoiceMessage(invoiceId, textToSend)
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data])
    } else {
      setErrorMsg(res.error || 'Failed to reply')
      setInputText(textToSend)
    }
    setIsSending(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden print:hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h3 className="font-sans text-sm font-bold text-gray-950 uppercase tracking-wider">
            Customer Discussion Thread &bull; {customerName}
          </h3>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="p-6 h-72 overflow-y-auto space-y-3 bg-[#FCFBF8]">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Checking conversation thread...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-1 text-gray-400">
            <MessageSquare className="w-6 h-6 stroke-1" />
            <p className="text-xs font-semibold text-gray-600">No customer messages</p>
            <p className="text-[11px] text-gray-400">
              When the collector sends a question from their public invoice page, it will appear here in real-time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_type === 'admin'
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-gray-600">
                    {isAdmin ? 'Gallery Admin' : msg.sender_name || 'Customer'}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    isAdmin
                      ? 'bg-neutral-900 text-white rounded-br-xs'
                      : 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message_text}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {errorMsg && (
        <div className="px-6 py-2 bg-rose-50 text-rose-700 text-xs border-t border-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Admin Reply Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Reply to ${customerName}...`}
          className="flex-1 h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:border-black outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="h-10 px-4 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'Sending...' : 'Reply'}</span>
        </button>
      </form>
    </div>
  )
}
