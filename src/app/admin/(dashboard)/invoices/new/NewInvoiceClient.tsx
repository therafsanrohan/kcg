'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Search,
  User,
  Building,
  Check,
  X,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Frame,
  Truck,
  CreditCard,
  DollarSign,
  ChevronDown,
} from 'lucide-react'
import { createInvoiceDraft, searchInventoryArtworksAction } from '../actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import CustomSelect from '@/components/ui/CustomSelect'
import { Client } from '@/types/invoice'
import { DeliveryZone } from '@/types'
import { getPaintingImageUrl } from '@/utils/image'
import {
  formatMedium,
  calculateSuggestedOuterSize,
  calculateFramePrice,
  isDoubleBitFrame,
  isSingleBitFrame,
  parseLegacyDisplaySize,
} from '@/utils/measurements'

interface InvoiceItemDraft {
  item_type: 'painting' | 'frame' | 'delivery' | 'custom'
  painting_id?: string
  item_name: string
  item_description?: string
  artwork_sku?: string
  size_snapshot?: string
  quantity: number
  unit_price_bdt: number
}

interface NewInvoiceClientProps {
  paintings: any[]
  clients: Client[]
  deliveryZones?: DeliveryZone[]
}

export default function NewInvoiceClient({ paintings, clients, deliveryZones = [] }: NewInvoiceClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // CRM Client Selection State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  // Form states
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [saveAsNewClient, setSaveAsNewClient] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')

  // Separate Financial Sections
  // Framing Section
  const [framingEnabled, setFramingEnabled] = useState(false)
  const [framingType, setFramingType] = useState('Classic Wooden Box Frame')
  const [framingSpecs, setFramingSpecs] = useState('')
  const [framingDimensions, setFramingDimensions] = useState('')
  const [framingQuantity, setFramingQuantity] = useState<number>(1)
  const [framingUnitPrice, setFramingUnitPrice] = useState<number>(0)

  // Delivery Section
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Courier Delivery')
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Additional Charges & Adjustments
  const [additionalChargeLabel, setAdditionalChargeLabel] = useState('Installation / Additional Service')
  const [additionalCharge, setAdditionalCharge] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')

  // Advance / Partial Payment Section
  const [recordAdvancePayment, setRecordAdvancePayment] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState('bank_transfer')
  const [advancePaymentDate, setAdvancePaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [advanceTransactionRef, setAdvanceTransactionRef] = useState('')
  const [advanceNotes, setAdvanceNotes] = useState('Advance deposit received')

  // Live Database Inventory Search State for Line Items with Race-Condition Protection
  const [activeInventorySearchIdx, setActiveInventorySearchIdx] = useState<number | null>(null)
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>(paintings)
  const [isSearchingInventory, setIsSearchingInventory] = useState(false)
  const latestQueryRef = useRef<string>('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Item list
  const [items, setItems] = useState<InvoiceItemDraft[]>([
    {
      item_type: 'painting',
      item_name: '',
      quantity: 1,
      unit_price_bdt: 0,
    },
  ])

  const { toast } = useAdminFeedback()

  // Real-time server-side search with debouncing & race-condition cancellation
  const handleInventorySearchChange = (queryText: string) => {
    setInventoryQuery(queryText)
    latestQueryRef.current = queryText

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!queryText.trim()) {
      setSearchResults(paintings.slice(0, 10))
      setIsSearchingInventory(false)
      return
    }

    setIsSearchingInventory(true)

    searchTimeoutRef.current = setTimeout(async () => {
      const activeQuery = queryText.trim()
      try {
        const res = await searchInventoryArtworksAction(activeQuery)
        // Discard result if query has changed since request started
        if (latestQueryRef.current !== queryText) {
          return
        }

        if (res.success && res.data) {
          setSearchResults(res.data)
        } else {
          // Local fallback filter
          const q = activeQuery.toLowerCase()
          setSearchResults(
            paintings.filter(
              (p) =>
                p.title.toLowerCase().includes(q) ||
                (p.painting_type && formatMedium(p.painting_type).toLowerCase().includes(q)) ||
                (p.display_size && p.display_size.toLowerCase().includes(q))
            )
          )
        }
      } catch (e) {
        console.warn('Error during inventory live search:', e)
      } finally {
        if (latestQueryRef.current === queryText) {
          setIsSearchingInventory(false)
        }
      }
    }, 200)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Client Selection Handler
  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id)
    setCustomerName(client.name)
    setCustomerPhone(client.phone)
    setCustomerEmail(client.email || '')
    setCustomerAddress(client.billing_address || '')
    setShowClientDropdown(false)
    setClientSearch('')
    toast(`Client selected: ${client.name}`, 'info')
  }

  const handleClearClient = () => {
    setSelectedClientId(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerAddress('')
  }

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 5)
    const q = clientSearch.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.client_number && c.client_number.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.organization_name && c.organization_name.toLowerCase().includes(q))
    )
  }, [clients, clientSearch])

  // Helper to extract primary/main image key from a painting
  const getPaintingMainImage = (art: any): string | null => {
    if (art.painting_images && Array.isArray(art.painting_images) && art.painting_images.length > 0) {
      const main = art.painting_images.find((img: any) => img.is_main) || art.painting_images[0]
      return main?.storage_key || null
    }
    return art.primary_image_url || null
  }

  // Inventory Artwork Selection Handler
  const handleSelectArtwork = (index: number, artwork: any) => {
    const price = Number(artwork.discount_price_bdt || artwork.base_price_bdt) || 0
    const dims = artwork.display_size || (artwork.width && artwork.height ? `${artwork.width} × ${artwork.height} in` : '')

    setItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        painting_id: artwork.id,
        item_name: artwork.title,
        item_description: artwork.exact_medium || (artwork.painting_type ? formatMedium(artwork.painting_type) : ''),
        size_snapshot: dims,
        unit_price_bdt: price,
        item_type: 'painting',
      }
      return copy
    })

    // Auto-reduction for framing: if artwork has preconfigured active frame_options, apply the first active frame
    if (artwork.frame_options && Array.isArray(artwork.frame_options) && artwork.frame_options.length > 0) {
      const activeFrame = artwork.frame_options.find((f: any) => f.is_active) || artwork.frame_options[0]
      if (activeFrame) {
        setFramingEnabled(true)
        setFramingType(activeFrame.frame_name || 'Double-Bit frame (White)')
        if (activeFrame.outer_size) setFramingDimensions(activeFrame.outer_size)
        if (Number(activeFrame.price_bdt) > 0) setFramingUnitPrice(Number(activeFrame.price_bdt))
      }
    } else if (dims) {
      // Auto calculate frame dimensions & price based on artwork dimensions and current framing type
      const parsed = parseLegacyDisplaySize(dims)
      if (parsed) {
        const outer = calculateSuggestedOuterSize(parsed.width, parsed.height, parsed.unit, framingType)
        const framePrice = calculateFramePrice(framingType, parsed.width, parsed.height, parsed.unit)
        if (outer) setFramingDimensions(outer)
        if (framePrice > 0) setFramingUnitPrice(framePrice)
      }
    }

    setActiveInventorySearchIdx(null)
    setInventoryQuery('')
    toast(`Populated line item from: ${artwork.title}`, 'info')
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { item_type: 'custom', item_name: '', quantity: 1, unit_price_bdt: 0 },
    ])
  }


  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculations
  const artworkSubtotal = items.reduce(
    (sum, item) => sum + (Number(item.unit_price_bdt) || 0) * (Number(item.quantity) || 1),
    0
  )
  const framingSubtotal = framingEnabled
    ? (Number(framingUnitPrice) || 0) * (Number(framingQuantity) || 1)
    : 0

  const itemsSubtotal = artworkSubtotal + framingSubtotal
  const grandTotal = Math.max(
    0,
    itemsSubtotal + Number(deliveryCharge) + Number(additionalCharge) - Number(discount)
  )

  const validatedAdvanceAmount = Math.min(Number(advanceAmount) || 0, grandTotal)
  const estimatedRemainingDue = Math.max(0, grandTotal - (recordAdvancePayment ? validatedAdvanceAmount : 0))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!customerName.trim() || !customerPhone.trim()) {
      const err = 'Customer name and phone number are required.'
      setErrorMessage(err)
      toast(err, 'error')
      return
    }

    if (items.length === 0 || !items.some((i) => i.item_name.trim())) {
      const err = 'Please add at least one line item with a name.'
      setErrorMessage(err)
      toast(err, 'error')
      return
    }

    startTransition(async () => {
      // Assemble all valid line items, including separate framing line item if enabled
      const finalItems: any[] = items
        .filter((i) => i.item_name.trim())
        .map((i) => ({
          ...i,
          item_type: i.item_type || 'painting',
        }))

      if (framingEnabled && framingUnitPrice > 0) {
        finalItems.push({
          item_type: 'frame',
          item_name: `Custom Framing: ${framingType}`,
          item_description: framingSpecs
            ? `${framingSpecs}${framingDimensions ? ` (${framingDimensions})` : ''}`
            : framingDimensions || 'Custom Gallery Frame Moulding',
          size_snapshot: framingDimensions || null,
          quantity: Math.max(1, Number(framingQuantity) || 1),
          unit_price_bdt: Number(framingUnitPrice),
        })
      }

      const payload = {
        client_id: selectedClientId,
        save_as_new_client: saveAsNewClient,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        customer_address: customerAddress || null,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        delivery_charge_bdt: deliveryCharge,
        additional_charge_bdt: additionalCharge,
        discount_bdt: discount,
        notes: notes || null,
        terms: terms || null,
        items: finalItems,
        // Advance Payment fields
        advance_payment_bdt: recordAdvancePayment ? validatedAdvanceAmount : 0,
        advance_payment_method: advancePaymentMethod,
        advance_payment_date: advancePaymentDate,
        advance_transaction_ref: advanceTransactionRef,
        advance_internal_notes: advanceNotes,
      }

      const res = await createInvoiceDraft(payload)
      if (res.success && res.invoiceId) {
        toast('Invoice created successfully!', 'success')
        router.push(`/admin/invoices/${res.invoiceId}`)
      } else {
        const errorText = res.error || 'Failed to create invoice'
        setErrorMessage(errorText)
        toast(errorText, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/invoices"
            className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-100 transition-all shadow-xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-950">
              New Customer Invoice
            </h1>
            <p className="text-xs text-gray-500 font-light mt-0.5">
              Draft an itemized invoice for artwork or framing
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-5 rounded-xl bg-black text-white text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isPending ? 'Saving...' : 'Save Draft'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Client Selection & Customer Details Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Client Details</h2>
            <p className="text-xs text-gray-500">Select an existing CRM client or enter details directly</p>
          </div>

          {/* Quick CRM Client Search Selector */}
          <div className="relative">
            {selectedClientId ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Linked to CRM Profile</span>
                <button
                  type="button"
                  onClick={handleClearClient}
                  className="p-1 hover:text-rose-600 transition-colors"
                  title="Unlink Client"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-black transition-all bg-gray-50"
                >
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>Choose from Client Directory ({clients.length})</span>
                </button>

                {showClientDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-88 bg-white rounded-2xl border border-gray-200 shadow-xl z-30 p-3 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by ID (e.g. KCG-CL-0001), name, or phone..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {filteredClients.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 text-center">No matching clients found</p>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900">{c.name}</span>
                                {c.client_number && (
                                  <span className="text-[10px] font-mono text-gray-400">({c.client_number})</span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 font-mono">{c.phone}</span>
                            </div>
                            {c.membership_tier && c.membership_tier !== 'none' && (
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                {c.membership_tier}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Sarah Ahmed"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 01824951514"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-black focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Delivery / Billing Address
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="House 12, Road 4, Gulshan-2, Dhaka"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
            />
          </div>
        </div>

        {/* Manual Entry Option: Explicit Save as New Client Checkbox */}
        {!selectedClientId && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={saveAsNewClient}
                onChange={(e) => setSaveAsNewClient(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span>Save this customer profile into permanent Client Directory</span>
            </label>
            <span className="text-[11px] text-gray-400">
              {saveAsNewClient ? 'Profile will be saved with auto-generated Client ID' : 'Manual one-off billing only (no permanent record)'}
            </span>
          </div>
        )}
      </div>

      {/* ── Dates Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">
          Invoice Schedule
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── Line Items Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Line Items & Artwork Inventory</h2>
            <p className="text-xs text-gray-500 font-light mt-0.5">
              Search and auto-fill from gallery inventory or add custom services
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="h-9 px-3.5 rounded-xl border border-gray-200 text-gray-700 hover:border-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-gray-200/90 bg-gray-50/50 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Item #{idx + 1}
                </span>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Gallery Inventory Quick Search Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (activeInventorySearchIdx === idx) {
                      setActiveInventorySearchIdx(null)
                    } else {
                      setActiveInventorySearchIdx(idx)
                      setInventoryQuery('')
                      setSearchResults(paintings.slice(0, 20))
                    }
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-dashed border-gray-300 hover:border-black bg-white flex items-center justify-between text-xs text-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {item.painting_id ? `Selected: ${item.item_name}` : 'Search Gallery Inventory to Auto-fill...'}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Inventory</span>
                </button>

                {activeInventorySearchIdx === idx && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl z-30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Type artwork title, medium or size..."
                          value={inventoryQuery}
                          onChange={(e) => handleInventorySearchChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setActiveInventorySearchIdx(null)
                              setInventoryQuery('')
                            }
                          }}
                          autoFocus
                          className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                        />
                        {isSearchingInventory ? (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">
                            Searching...
                          </div>
                        ) : inventoryQuery ? (
                          <button
                            type="button"
                            onClick={() => handleInventorySearchChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-black cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInventorySearchIdx(null)
                          setInventoryQuery('')
                        }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                      {searchResults.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">No matching artworks found in inventory</p>
                      ) : (
                        searchResults.map((art) => (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => handleSelectArtwork(idx, art)}
                            className="w-full text-left p-2.5 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-between gap-3 group/item cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {getPaintingMainImage(art) ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative border border-gray-200">
                                  <Image
                                    src={getPaintingImageUrl(getPaintingMainImage(art)!, 'paintings_optimized')}
                                    alt={art.title}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-[10px] font-bold">
                                  ART
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate group-hover/item:text-black">
                                  {art.title}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {art.display_size || (art.width && art.height ? `${art.width} × ${art.height} cm` : 'Custom Size')} • {formatMedium(art.painting_type)}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold font-mono text-gray-950 whitespace-nowrap bg-gray-50 px-2 py-1 rounded border border-gray-100">
                              ৳{Number(art.discount_price_bdt || art.base_price_bdt).toLocaleString('en-BD')}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Line Item Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.item_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].item_name = val
                        return copy
                      })
                    }}
                    placeholder="e.g. Sunset Serenade Oil Painting"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-black outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].quantity = val
                        return copy
                      })
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:border-black outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit Price (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={item.unit_price_bdt}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].unit_price_bdt = val
                        return copy
                      })
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:border-black outline-none bg-white"
                  />
                </div>
              </div>

              <div className="text-right pt-2 border-t border-gray-200/50">
                <span className="text-xs text-gray-500">Row Total: </span>
                <span className="text-xs font-bold font-mono text-gray-900">
                  ৳{((item.unit_price_bdt || 0) * (item.quantity || 1)).toLocaleString('en-BD')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Separate Framing Section ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Frame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Custom Framing</h2>
              <p className="text-xs text-gray-500 font-light">
                Add Italian or custom wooden framing options to this invoice
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800 select-none">
            <input
              type="checkbox"
              checked={framingEnabled}
              onChange={(e) => setFramingEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
            />
            <span>Include Framing</span>
          </label>
        </div>

        {framingEnabled ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Frame Moulding Type
                </label>
                {(() => {
                  // Find the selected painting from items to get its existing input frame options
                  const selectedArtItem = items.find((i) => i.item_type === 'painting' && i.painting_id)
                  const matchingPainting = selectedArtItem
                    ? paintings.find((p) => p.id === selectedArtItem.painting_id)
                    : null
                  const existingFrames = matchingPainting?.frame_options || []

                  // Create dynamic options list from existing inputs
                  const dynamicOptions =
                    existingFrames.length > 0
                      ? existingFrames.map((f: any) => ({
                          value: f.frame_name,
                          label: `${f.frame_name} (${f.outer_size || 'Custom Size'} · ৳${Number(f.price_bdt || 0).toLocaleString('en-BD')})`,
                        }))
                      : [
                          { value: 'Double-Bit frame (White)', label: 'Double-Bit frame (White)' },
                          { value: 'Double-Bit frame (Black)', label: 'Double-Bit frame (Black)' },
                          { value: 'Single-Bit frame (White)', label: 'Single-Bit frame (White)' },
                          { value: 'Single-Bit frame (Black)', label: 'Single-Bit frame (Black)' },
                          { value: 'Custom Frame (Specified Below)', label: 'Custom Frame (Specified Below)' },
                        ]

                  return (
                    <CustomSelect
                      value={framingType}
                      onChange={(e) => {
                        const newType = e.target.value
                        setFramingType(newType)

                        // 1. Check if the chosen frame matches an existing frame configured on this artwork
                        const matchedExisting = existingFrames.find(
                          (f: any) => f.frame_name.toLowerCase().trim() === newType.toLowerCase().trim()
                        )
                        if (matchedExisting) {
                          if (matchedExisting.outer_size) setFramingDimensions(matchedExisting.outer_size)
                          if (Number(matchedExisting.price_bdt) > 0) setFramingUnitPrice(Number(matchedExisting.price_bdt))
                          return
                        }

                        // 2. Otherwise auto-calculate from artwork dimensions
                        const targetDims = selectedArtItem?.size_snapshot || framingDimensions
                        if (targetDims) {
                          const parsed = parseLegacyDisplaySize(targetDims)
                          if (parsed) {
                            const outer = calculateSuggestedOuterSize(parsed.width, parsed.height, parsed.unit, newType)
                            const price = calculateFramePrice(newType, parsed.width, parsed.height, parsed.unit)
                            if (outer) setFramingDimensions(outer)
                            if (price > 0) setFramingUnitPrice(price)
                          }
                        }
                      }}
                      options={dynamicOptions}
                    />
                  )
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Frame Dimensions / Fitting Size
                </label>
                <input
                  type="text"
                  value={framingDimensions}
                  onChange={(e) => setFramingDimensions(e.target.value)}
                  placeholder="e.g. 24 × 36 inches / 2.5 inch border"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={framingQuantity}
                  onChange={(e) => setFramingQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:border-black outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Frame Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={framingUnitPrice}
                  onChange={(e) => setFramingUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:border-black outline-none"
                />
              </div>

              <div className="sm:col-span-1 flex flex-col justify-end">
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900">Framing Total:</span>
                  <span className="font-bold font-mono text-amber-950">
                    ৳{framingSubtotal.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">
                Framing Specifications & Mount Notes (Optional)
              </label>
              <input
                type="text"
                value={framingSpecs}
                onChange={(e) => setFramingSpecs(e.target.value)}
                placeholder="e.g. Acid-free matting, acrylic glass, teak wood backing"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 focus:border-black outline-none"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No custom framing selected for this invoice. Click “Include Framing” if framing is ordered.
          </p>
        )}
      </div>

      {/* ── Separate Delivery Section ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Delivery & Logistics</h2>
            <p className="text-xs text-gray-500 font-light">
              Explicit delivery charges and courier specifications
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Delivery Method / Area (Settings Linked)
            </label>
            <CustomSelect
              value={deliveryMethod}
              onChange={(e) => {
                const selectedMethod = e.target.value
                setDeliveryMethod(selectedMethod)
                // If selected method corresponds to a zone from settings, auto-fill charge
                const matchedZone = deliveryZones.find((z) => z.label === selectedMethod)
                if (matchedZone) {
                  if (matchedZone.free_delivery || matchedZone.pricing_mode === 'free') {
                    setDeliveryCharge(0)
                  } else {
                    setDeliveryCharge(Number(matchedZone.charge_bdt) || 0)
                  }
                  if (matchedZone.estimated_delivery_time) {
                    setDeliveryNotes((prev) => prev ? prev : `Estimated delivery: ${matchedZone.estimated_delivery_time}`)
                  }
                } else if (selectedMethod.includes('Pickup') || selectedMethod.includes('Free')) {
                  setDeliveryCharge(0)
                }
              }}
              options={
                deliveryZones.length > 0
                  ? [
                      ...deliveryZones.map((z) => ({
                        value: z.label,
                        label: `${z.label} (${z.free_delivery || z.pricing_mode === 'free' ? 'Free' : `৳${Number(z.charge_bdt || 0).toLocaleString('en-BD')}`})`,
                      })),
                      { value: 'Customer Studio Pickup (Free)', label: 'Customer Studio Pickup (Free)' },
                      { value: 'Express Same-Day Studio Courier', label: 'Express Same-Day Studio Courier' },
                    ]
                  : [
                      { value: 'Inside Dhaka Gallery Van Delivery', label: 'Inside Dhaka Gallery Van Delivery' },
                      { value: 'Outside Dhaka Dedicated Courier', label: 'Outside Dhaka Dedicated Courier' },
                      { value: 'Express Same-Day Studio Courier', label: 'Express Same-Day Studio Courier' },
                      { value: 'Customer Studio Pickup (Free)', label: 'Customer Studio Pickup (Free)' },
                      { value: 'Standard Courier Delivery', label: 'Standard Courier Delivery' },
                    ]
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-800">
                Delivery Charge (৳)
              </label>
              {deliveryCharge > 0 && (
                <button
                  type="button"
                  onClick={() => setDeliveryCharge(0)}
                  className="text-[10px] text-gray-500 hover:text-black underline cursor-pointer"
                >
                  Waive Fee (৳0)
                </button>
              )}
            </div>
            <input
              type="number"
              min="0"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-black outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">
            Delivery Instructions & Tracking Notes (Optional)
          </label>
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="e.g. Fragile artwork handling required. Contact customer 30 minutes before arrival."
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 focus:border-black outline-none bg-white"
          />
        </div>
      </div>

      {/* ── Separate Advance / Partial Payment Section ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Advance / Initial Payment</h2>
              <p className="text-xs text-gray-500 font-light">
                Record an upfront token or partial advance payment received with this order
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800 select-none">
            <input
              type="checkbox"
              checked={recordAdvancePayment}
              onChange={(e) => setRecordAdvancePayment(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Record Advance Payment</span>
          </label>
        </div>

        {recordAdvancePayment ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Advance Amount Received (৳) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={grandTotal}
                  value={advanceAmount || ''}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-sm font-mono text-gray-900 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Payment Method
                </label>
                <CustomSelect
                  value={advancePaymentMethod}
                  onChange={(e) => setAdvancePaymentMethod(e.target.value)}
                  options={[
                    { value: 'bank_transfer', label: 'Bank Transfer / Wire' },
                    { value: 'bkash', label: 'bKash Merchant / Personal' },
                    { value: 'nagad', label: 'Nagad' },
                    { value: 'cash', label: 'Cash at Gallery' },
                    { value: 'card', label: 'POS Card Payment' },
                    { value: 'other', label: 'Other Authorized Method' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={advancePaymentDate}
                  onChange={(e) => setAdvancePaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-mono text-gray-900 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">
                  Transaction / TrxID / Check Reference (Optional)
                </label>
                <input
                  type="text"
                  value={advanceTransactionRef}
                  onChange={(e) => setAdvanceTransactionRef(e.target.value)}
                  placeholder="e.g. TRX-9J28312 / City Bank Ref"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-800 focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">
                  Internal Payment Note
                </label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. 50% deposit received via bKash"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60 font-semibold text-emerald-900">
              <span>Advance Paid: ৳{validatedAdvanceAmount.toLocaleString('en-BD')}</span>
              <span>Remaining Due: ৳{estimatedRemainingDue.toLocaleString('en-BD')}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Invoice will be created with status “Unpaid”. Check above to register an advance payment.
          </p>
        )}
      </div>

      {/* ── Financial Summary & Adjustments Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">
          Financial Adjustments & Grand Total
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Delivery Fee (৳)
            </label>
            <input
              type="number"
              min="0"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Discount (৳)
            </label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Additional Fee (৳)
            </label>
            <input
              type="number"
              min="0"
              value={additionalCharge}
              onChange={(e) => setAdditionalCharge(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-black outline-none"
            />
          </div>
        </div>

          {/* Live Calculation Receipt Summary */}
        <div className="bg-gray-50/80 rounded-2xl p-4 sm:p-6 border border-gray-100 space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Artwork Items Subtotal</span>
            <span className="font-mono">৳{artworkSubtotal.toLocaleString('en-BD')}</span>
          </div>

          {framingEnabled && framingSubtotal > 0 && (
            <div className="flex justify-between text-xs text-amber-900 font-medium">
              <span>Custom Framing ({framingType})</span>
              <span className="font-mono">+৳{framingSubtotal.toLocaleString('en-BD')}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-800 font-semibold pt-1 border-t border-gray-200/50">
            <span>Combined Items Subtotal</span>
            <span className="font-mono">৳{itemsSubtotal.toLocaleString('en-BD')}</span>
          </div>

          {deliveryCharge > 0 && (
            <div className="flex justify-between text-xs text-blue-900 font-medium">
              <span>Delivery & Courier ({deliveryMethod})</span>
              <span className="font-mono">+৳{deliveryCharge.toLocaleString('en-BD')}</span>
            </div>
          )}

          {additionalCharge > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>{additionalChargeLabel || 'Additional Service'}</span>
              <span className="font-mono">+৳{additionalCharge.toLocaleString('en-BD')}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-medium">
              <span>Approved Discount</span>
              <span className="font-mono">-৳{discount.toLocaleString('en-BD')}</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-gray-950">Grand Total</span>
            <span className="text-xl font-bold font-mono text-gray-950">
              ৳{grandTotal.toLocaleString('en-BD')}
            </span>
          </div>

          {recordAdvancePayment && validatedAdvanceAmount > 0 && (
            <>
              <div className="flex justify-between text-xs text-emerald-700 font-semibold pt-1">
                <span>Advance Payment Recorded</span>
                <span className="font-mono">-৳{validatedAdvanceAmount.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-rose-700 pt-1 border-t border-dashed border-gray-200">
                <span>Remaining Due at Delivery</span>
                <span className="font-mono">৳{estimatedRemainingDue.toLocaleString('en-BD')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Terms & Notes ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          Notes & Payment Instructions
        </h2>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Customer-Facing Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thank you for supporting Kazi Canvas Gallery. Original artwork handcrafted in Dhaka."
            className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-black outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Terms & Conditions
          </label>
          <textarea
            rows={2}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Payment due upon delivery. Certified authentic by KCG."
            className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-black outline-none"
          />
        </div>
      </div>
    </form>
  )
}
