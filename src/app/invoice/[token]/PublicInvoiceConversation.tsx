'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, X, Clock, Check, User, ShieldCheck } from 'lucide-react'
import {
  InvoiceMessage,
  getPublicInvoiceMessages,
  sendCustomerInvoiceMessage,
} from '@/app/invoice/conversation-actions'

interface PublicInvoiceConversationProps {
  shareToken: string
  customerName?: string
  invoiceNumber?: string
}

export default function PublicInvoiceConversation({
  shareToken,
  customerName = 'Collector',
  invoiceNumber = 'Invoice',
}: PublicInvoiceConversationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<InvoiceMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch messages function
  const loadMessages = async () => {
    const res = await getPublicInvoiceMessages(shareToken)
    if (res.success && res.data) {
      setMessages(res.data)
    }
  }

  // Load messages and subscribe to Supabase Realtime channel
  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    loadMessages().finally(() => setIsLoading(false))

    // Realtime subscription via Supabase Client
    let channel: any = null
    try {
      const { createClient } = require('@/utils/supabase/client')
      const supabase = createClient()
      channel = supabase
        .channel(`public-invoice-${shareToken}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'invoice_messages',
          },
          (payload: any) => {
            if (payload?.new) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev
                return [...prev, payload.new as InvoiceMessage]
              })
            }
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Realtime subscription not initialized, falling back to polling', e)
    }

    // Polling fallback every 8 seconds
    const interval = setInterval(loadMessages, 8000)

    return () => {
      clearInterval(interval)
      if (channel) {
        try {
          const { createClient } = require('@/utils/supabase/client')
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [isOpen, shareToken])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)
    setErrorMsg(null)

    const res = await sendCustomerInvoiceMessage(shareToken, customerName, textToSend)
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data])
    } else {
      setErrorMsg(res.error || 'Failed to send message. Please try again.')
      setInputText(textToSend)
    }
    setIsSending(false)
  }

  return (
    <>
      {/* Floating Entry Button on Public Page */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-black text-white text-xs font-semibold shadow-xl hover:bg-gray-800 transition-all hover:scale-105 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>Discuss This Invoice</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Slide-out / Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col h-[520px] print:hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-neutral-900 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center border border-emerald-500/50">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  Gallery Concierge
                </h4>
                <p className="text-[10px] text-gray-300">
                  Ref: {invoiceNumber}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close discussion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subheader Notice */}
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-[10px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>Direct private conversation regarding this invoice.</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]">
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                <MessageSquare className="w-8 h-8 text-gray-300" />
                <p className="text-xs font-semibold text-gray-700">No messages yet</p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Have questions about payment, delivery schedule, or custom framing? Send a message to our gallery curators below.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.sender_type === 'customer'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-semibold text-gray-500">
                        {isCustomer ? 'You' : 'Kazi Canvas Gallery'}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-black text-white rounded-br-xs'
                          : 'bg-white text-gray-900 border border-gray-200/90 rounded-bl-xs shadow-xs'
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

          {/* Error Message if any */}
          {errorMsg && (
            <div className="px-4 py-1.5 bg-rose-50 text-rose-700 text-[10px] border-t border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about delivery, framing, payment..."
              className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:border-black outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="h-10 w-10 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
