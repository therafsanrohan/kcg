'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  UserCheck,
  Edit2,
  X,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { Client } from '@/types/invoice'
import { createClientRecord, updateClientRecord } from './actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import CustomSelect from '@/components/ui/CustomSelect'

interface ClientManagerClientProps {
  initialClients: (Client & { invoices?: { count: number }[] })[]
}

export default function ClientManagerClient({ initialClients }: ClientManagerClientProps) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useAdminFeedback()

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [clientType, setClientType] = useState<'individual' | 'organization'>('individual')
  const [orgName, setOrgName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [membershipTier, setMembershipTier] = useState<string>('none')
  const [membershipStatus, setMembershipStatus] = useState<string>('active')
  const [membershipStartDate, setMembershipStartDate] = useState<string>('')
  const [membershipExpiryDate, setMembershipExpiryDate] = useState<string>('')
  const [internalNotes, setInternalNotes] = useState('')

  const openNewModal = () => {
    setEditingClient(null)
    setName('')
    setPhone('')
    setEmail('')
    setClientType('individual')
    setOrgName('')
    setBillingAddress('')
    setShippingAddress('')
    setTaxId('')
    setMembershipTier('none')
    setMembershipStatus('active')
    setMembershipStartDate(new Date().toISOString().split('T')[0])
    setMembershipExpiryDate('')
    setInternalNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setName(client.name)
    setPhone(client.phone)
    setEmail(client.email || '')
    setClientType(client.client_type || 'individual')
    setOrgName(client.organization_name || '')
    setBillingAddress(client.billing_address || '')
    setShippingAddress(client.shipping_address || '')
    setTaxId(client.tax_id || '')
    setMembershipTier(client.membership_tier || 'none')
    setMembershipStatus(client.membership_status || 'active')
    setMembershipStartDate(client.membership_start_date || '')
    setMembershipExpiryDate(client.membership_expiry_date || '')
    setInternalNotes(client.internal_notes || '')
    setIsModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast('Client Name and Phone Number are required.', 'error')
      return
    }

    startTransition(async () => {
      const payload: Partial<Client> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        client_type: clientType,
        organization_name: orgName.trim() || null,
        billing_address: billingAddress.trim() || null,
        shipping_address: shippingAddress.trim() || null,
        tax_id: taxId.trim() || null,
        membership_tier: membershipTier,
        membership_status: membershipStatus,
        membership_start_date: membershipStartDate || null,
        membership_expiry_date: membershipExpiryDate || null,
        internal_notes: internalNotes.trim() || null,
      }

      if (editingClient) {
        const res = await updateClientRecord(editingClient.id, payload)
        if (res.success) {
          toast('Client profile updated successfully', 'success')
          setClients((prev) =>
            prev.map((c) => (c.id === editingClient.id ? { ...c, ...payload } : c))
          )
          setIsModalOpen(false)
        } else {
          toast(res.error || 'Failed to update client', 'error')
        }
      } else {
        const res = await createClientRecord(payload)
        if (res.success && res.client) {
          toast('Client registered successfully', 'success')
          setClients((prev) => [res.client, ...prev])
          setIsModalOpen(false)
        } else {
          toast(res.error || 'Failed to create client', 'error')
        }
      }
    })
  }

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.client_number && c.client_number.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.organization_name && c.organization_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* ── Action & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-88">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Client ID (e.g. KCG-CL-0001), name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-black outline-none transition-all shadow-xs"
          />
        </div>

        <button
          onClick={openNewModal}
          type="button"
          className="h-11 px-5 rounded-xl bg-black text-white text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md hover:shadow-lg w-full sm:w-auto justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* ── Client Cards Grid ── */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center px-4">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-sans text-lg font-bold text-gray-950 mb-1">No clients found</h3>
          <p className="text-xs text-gray-500 font-light max-w-sm mx-auto mb-6">
            Register clients to easily select them during invoice creation, track membership tiers, and maintain billing history.
          </p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const invoiceCount = client.invoices?.[0]?.count ?? 0
            const tier = client.membership_tier || 'none'
            const isMember = tier !== 'none'

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:border-gray-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {client.client_number || 'KCG-CL-NEW'}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {client.client_type}
                        </span>
                      </div>

                      <h3 className="font-sans font-bold text-base text-gray-950 mt-1">
                        {client.name}
                      </h3>

                      {client.organization_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Building className="w-3 h-3 text-gray-400" />
                          {client.organization_name}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Membership Badge */}
                  {isMember && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold capitalize text-amber-800">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        {tier} Member
                      </span>
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                        {client.membership_status || 'active'}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-mono">{client.phone}</span>
                    </p>
                    {client.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.billing_address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.billing_address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    {invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal for New/Edit Client ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-sans text-xl font-bold text-gray-950">
                  {editingClient ? 'Edit Client Record' : 'Register New Client'}
                </h3>
                {editingClient?.client_number && (
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Client ID: {editingClient.client_number}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Client Type
                  </label>
                  <CustomSelect
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as any)}
                    options={[
                      { value: 'individual', label: 'Individual' },
                      { value: 'organization', label: 'Organization / Corporate' },
                    ]}
                  />
                </div>
              </div>

              {clientType === 'organization' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Company Ltd."
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none"
                  />
                </div>
              )}

              {/* Membership Configuration Section */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-800">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Membership & Loyalty Tier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Membership Tier
                    </label>
                    <CustomSelect
                      value={membershipTier}
                      onChange={(e) => setMembershipTier(e.target.value)}
                      options={[
                        { value: 'none', label: 'No Membership (Standard)' },
                        { value: 'standard', label: 'Standard Member' },
                        { value: 'silver', label: 'Silver Collector' },
                        { value: 'gold', label: 'Gold Patron' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Membership Status
                    </label>
                    <CustomSelect
                      value={membershipStatus}
                      onChange={(e) => setMembershipStatus(e.target.value)}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'expired', label: 'Expired' },
                      ]}
                    />
                  </div>
                </div>

                {membershipTier !== 'none' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={membershipStartDate}
                        onChange={(e) => setMembershipStartDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={membershipExpiryDate}
                        onChange={(e) => setMembershipExpiryDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono bg-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Street, Area, City, Postcode"
                  className="w-full p-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Internal Staff Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Collector preferences, framing instructions..."
                  className="w-full p-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Saving...' : editingClient ? 'Update Profile' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
