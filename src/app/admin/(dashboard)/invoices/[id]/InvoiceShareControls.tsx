'use client'

import { useState, useTransition } from 'react'
import { Share2, Copy, Check, ExternalLink, ShieldAlert, X, MessageSquare, Phone, Mail, Send } from 'lucide-react'
import { generateShareLink, revokeShareLink } from '../actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'

interface InvoiceShareControlsProps {
  invoiceId: string
  invoiceNumber?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  grandTotal?: number
  dueDate?: string | null
  initialShareToken?: string | null
  initialIsActive?: boolean
}

export default function InvoiceShareControls({
  invoiceId,
  invoiceNumber = 'Invoice',
  customerName = 'Valued Collector',
  customerPhone = '',
  customerEmail = '',
  grandTotal = 0,
  dueDate = null,
  initialShareToken,
  initialIsActive,
}: InvoiceShareControlsProps) {
  const [shareToken, setShareToken] = useState(initialShareToken || null)
  const [isActive, setIsActive] = useState(Boolean(initialIsActive))
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'link' | 'whatsapp' | 'sms' | 'email'>('whatsapp')

  // Editable recipient fields
  const [phoneRecipient, setPhoneRecipient] = useState(customerPhone)
  const [emailRecipient, setEmailRecipient] = useState(customerEmail)

  const { toast } = useAdminFeedback()

  const publicUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${shareToken}`
    : ''

  const defaultMessage = `Dear ${customerName},\n\nHere is your official invoice from Kazi Canvas Gallery.\n\n` +
    `📄 Invoice No: ${invoiceNumber}\n` +
    `💰 Total Due: ৳${Number(grandTotal).toLocaleString('en-BD')}\n` +
    (dueDate ? `📅 Payment Due: ${dueDate}\n` : '') +
    `\nView, download A4 PDF, or print your official invoice securely here:\n${publicUrl}\n\n` +
    `Thank you for collecting with Kazi Canvas Gallery!`

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateShareLink(invoiceId)
      if (res.success && res.shareToken) {
        setShareToken(res.shareToken)
        setIsActive(true)
        toast('Secure share link created!', 'success')
      } else {
        toast(res.error || 'Failed to generate link', 'error')
      }
    })
  }

  const handleRevoke = () => {
    startTransition(async () => {
      const res = await revokeShareLink(invoiceId)
      if (res.success) {
        setIsActive(false)
        toast('Share link revoked successfully', 'info')
      } else {
        toast(res.error || 'Failed to revoke link', 'error')
      }
    })
  }

  const handleCopyLink = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast('Copied public invoice link to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(defaultMessage)
    setCopiedMessage(true)
    toast('Copied message text to clipboard', 'info')
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  const handleOpenWhatsApp = () => {
    if (!publicUrl) {
      toast('Please activate the public share link first.', 'error')
      return
    }
    const cleanNumber = phoneRecipient.replace(/[^0-9]/g, '')
    const encodedMsg = encodeURIComponent(defaultMessage)
    const url = cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleOpenSMS = () => {
    if (!publicUrl) {
      toast('Please activate the public share link first.', 'error')
      return
    }
    const cleanNumber = phoneRecipient.replace(/[^0-9+]/g, '')
    const encodedBody = encodeURIComponent(
      `Kazi Canvas Gallery Invoice #${invoiceNumber}\nAmount: ৳${Number(grandTotal).toLocaleString('en-BD')}\nView: ${publicUrl}`
    )
    // Works across iOS and Android native SMS schemes
    const smsUrl = cleanNumber ? `sms:${cleanNumber}?&body=${encodedBody}` : `sms:?&body=${encodedBody}`
    window.location.href = smsUrl
  }

  const handleSendEmail = () => {
    if (!publicUrl) {
      toast('Please activate the public share link first.', 'error')
      return
    }
    const subject = encodeURIComponent(`Official Invoice #${invoiceNumber} — Kazi Canvas Gallery`)
    const body = encodeURIComponent(defaultMessage)
    const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient)}?subject=${subject}&body=${body}`
    window.location.href = mailtoUrl
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="h-10 px-4 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer print:hidden"
        title="Share invoice with customer via WhatsApp, SMS, or Email"
      >
        <Share2 className="w-4 h-4" />
        <span>Share & Send</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-gray-800" />
                <h3 className="font-sans text-lg font-bold text-gray-950">
                  Share & Deliver Invoice
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Link Status or Activation Button */}
            {isActive && shareToken ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Public share link is active
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRevoke}
                    className="text-xs text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer"
                  >
                    {isPending ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg bg-gray-100 p-1 border border-gray-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'whatsapp' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sms')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'sms' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'email' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'link' ? 'bg-white text-black shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Link</span>
                  </button>
                </div>

                {/* Tab 1: WhatsApp */}
                {activeTab === 'whatsapp' && (
                  <div className="space-y-3 bg-[#F0FDF4] border border-emerald-200/80 rounded-xl p-4 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Recipient WhatsApp / Phone Number:
                      </label>
                      <input
                        type="text"
                        value={phoneRecipient}
                        onChange={(e) => setPhoneRecipient(e.target.value)}
                        placeholder="e.g. 018XXXXXXXX or +88018..."
                        className="w-full h-9 px-3 rounded-lg border border-emerald-300 bg-white text-xs font-mono text-gray-900 focus:border-emerald-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Message Preview:
                      </label>
                      <textarea
                        readOnly
                        rows={5}
                        value={defaultMessage}
                        className="w-full p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 text-[11px] font-mono text-gray-800 resize-none outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Open WhatsApp Composer</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="px-3 h-10 rounded-xl border border-emerald-300 bg-white text-emerald-800 font-semibold hover:bg-emerald-50 transition-all flex items-center gap-1"
                        title="Copy message text"
                      >
                        {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Opens WhatsApp Web / Mobile with the pre-filled invoice message and recipient number.
                    </p>
                  </div>
                )}

                {/* Tab 2: SMS */}
                {activeTab === 'sms' && (
                  <div className="space-y-3 bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Mobile Phone Number:
                      </label>
                      <input
                        type="text"
                        value={phoneRecipient}
                        onChange={(e) => setPhoneRecipient(e.target.value)}
                        placeholder="e.g. 018XXXXXXXX"
                        className="w-full h-9 px-3 rounded-lg border border-blue-300 bg-white text-xs font-mono text-gray-900 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenSMS}
                        className="flex-1 h-10 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                        <span>Launch Native SMS Composer</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="px-3 h-10 rounded-xl border border-blue-300 bg-white text-blue-800 font-semibold hover:bg-blue-50 transition-all flex items-center gap-1"
                      >
                        {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Launches the default messaging app on iPhone or Android with the recipient and concise invoice link.
                    </p>
                  </div>
                )}

                {/* Tab 3: Email */}
                {activeTab === 'email' && (
                  <div className="space-y-3 bg-purple-50/60 border border-purple-200 rounded-xl p-4 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Recipient Email:
                      </label>
                      <input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="collector@example.com"
                        className="w-full h-9 px-3 rounded-lg border border-purple-300 bg-white text-xs text-gray-900 focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSendEmail}
                        className="flex-1 h-10 rounded-xl bg-purple-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-purple-800 transition-all cursor-pointer shadow-xs"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Open Email Client</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="px-3 h-10 rounded-xl border border-purple-300 bg-white text-purple-800 font-semibold hover:bg-purple-50 transition-all flex items-center gap-1"
                      >
                        {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Opens system email client with official subject, body, and secure public invoice link.
                    </p>
                  </div>
                )}

                {/* Tab 4: Direct Link */}
                {activeTab === 'link' && (
                  <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-xs font-mono text-gray-800 select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="h-10 px-3.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Public View</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    No active share link exists for this invoice yet. Generate an encrypted link first to enable WhatsApp, SMS, and Email sharing.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleGenerate}
                  className="w-full h-11 rounded-xl bg-black text-white text-xs sm:text-sm font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isPending ? 'Generating...' : 'Activate Public Share Link'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

