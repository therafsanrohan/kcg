'use client'

import { useState, useTransition, useMemo } from 'react'
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
} from 'lucide-react'
import { createInvoiceDraft, searchInventoryArtworksAction } from '../actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import CustomSelect from '@/components/ui/CustomSelect'
import { Client } from '@/types/invoice'
import { getPaintingImageUrl } from '@/utils/image'

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
}

export default function NewInvoiceClient({ paintings, clients }: NewInvoiceClientProps) {
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
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0)
  const [additionalCharge, setAdditionalCharge] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')

  // Live Database Inventory Search State for Line Items
  const [activeInventorySearchIdx, setActiveInventorySearchIdx] = useState<number | null>(null)
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>(paintings)
  const [isSearchingInventory, setIsSearchingInventory] = useState(false)

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

  // Real-time server-side search triggered on query change
  const handleInventorySearchChange = async (queryText: string) => {
    setInventoryQuery(queryText)
    if (!queryText.trim()) {
      setSearchResults(paintings.slice(0, 10))
      return
    }

    try {
      setIsSearchingInventory(true)
      const res = await searchInventoryArtworksAction(queryText)
      if (res.success && res.data) {
        setSearchResults(res.data)
      } else {
        // Fallback to local memory filter if offline/error
        const q = queryText.toLowerCase()
        setSearchResults(
          paintings.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              (p.exact_medium && p.exact_medium.toLowerCase().includes(q)) ||
              (p.display_size && p.display_size.toLowerCase().includes(q))
          )
        )
      }
    } catch (e) {
      console.warn('Error during inventory live search:', e)
    } finally {
      setIsSearchingInventory(false)
    }
  }

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

  // Inventory Artwork Selection Handler
  const handleSelectArtwork = (index: number, artwork: any) => {
    const price = Number(artwork.discount_price_bdt || artwork.base_price_bdt) || 0
    const dims = artwork.display_size || (artwork.width && artwork.height ? `${artwork.width} × ${artwork.height} cm` : '')

    setItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        painting_id: artwork.id,
        item_name: artwork.title,
        item_description: artwork.exact_medium ? `${artwork.exact_medium}` : '',
        size_snapshot: dims,
        unit_price_bdt: price,
        item_type: 'painting',
      }
      return copy
    })
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
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.unit_price_bdt) || 0) * (Number(item.quantity) || 1),
    0
  )
  const grandTotal = subtotal + Number(deliveryCharge) + Number(additionalCharge) - Number(discount)

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
        items: items.filter((i) => i.item_name.trim()),
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
                    setActiveInventorySearchIdx(activeInventorySearchIdx === idx ? null : idx)
                    setInventoryQuery('')
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
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Type artwork title, medium or size..."
                        value={inventoryQuery}
                        onChange={(e) => handleInventorySearchChange(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                      />
                      {isSearchingInventory && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">
                          Searching...
                        </div>
                      )}
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
                              {art.primary_image_url ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative border border-gray-200">
                                  <Image
                                    src={getPaintingImageUrl(art.primary_image_url, 'paintings_optimized')}
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
                                  {art.display_size || (art.width && art.height ? `${art.width} × ${art.height} cm` : 'Custom Size')} • {art.exact_medium}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Item Type
                  </label>
                  <CustomSelect
                    value={item.item_type}
                    onChange={(e) => {
                      const val = e.target.value as any
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].item_type = val
                        return copy
                      })
                    }}
                    options={[
                      { value: 'painting', label: 'Original Painting' },
                      { value: 'frame', label: 'Frame Moulding' },
                      { value: 'delivery', label: 'Delivery / Courier' },
                      { value: 'custom', label: 'Custom Service' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Size Snapshot (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.size_snapshot || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].size_snapshot = val
                        return copy
                      })
                    }}
                    placeholder="e.g. 24 × 36 in"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-black outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Description / Details
                  </label>
                  <input
                    type="text"
                    value={item.item_description || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setItems((prev) => {
                        const copy = [...prev]
                        copy[idx].item_description = val
                        return copy
                      })
                    }}
                    placeholder="Medium, framing style, certificate"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-black outline-none bg-white"
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
          {items.some((i) => i.item_type === 'painting') && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Artwork Subtotal</span>
              <span className="font-mono">
                ৳{items
                  .filter((i) => i.item_type === 'painting')
                  .reduce((sum, i) => sum + (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1), 0)
                  .toLocaleString('en-BD')}
              </span>
            </div>
          )}
          {items.some((i) => i.item_type === 'frame') && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Custom Framing Subtotal</span>
              <span className="font-mono">
                ৳{items
                  .filter((i) => i.item_type === 'frame')
                  .reduce((sum, i) => sum + (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1), 0)
                  .toLocaleString('en-BD')}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-800 font-semibold pt-1 border-t border-gray-200/50">
            <span>Items Subtotal</span>
            <span className="font-mono">৳{subtotal.toLocaleString('en-BD')}</span>
          </div>
          {deliveryCharge > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-mono">+৳{deliveryCharge.toLocaleString('en-BD')}</span>
            </div>
          )}
          {additionalCharge > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Additional Service / Installation</span>
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
