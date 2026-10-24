'use client'

import { Printer } from 'lucide-react'

interface InvoicePrintButtonProps {
  invoiceNumber?: string
  customerName?: string
}

export default function InvoicePrintButton({
  invoiceNumber,
  customerName,
}: InvoicePrintButtonProps) {
  const handlePrint = () => {
    // Generate clean sanitized filename for print/PDF export
    const cleanNumber = (invoiceNumber || 'INVOICE').trim().replace(/[/\\?%*:|"<>]/g, '-')
    const cleanCustomer = (customerName || 'Customer')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')

    const originalTitle = document.title
    const pdfFilename = `${cleanNumber}_${cleanCustomer}`

    try {
      document.title = pdfFilename
      window.print()
    } finally {
      // Restore page title after print dialogue opens
      setTimeout(() => {
        document.title = originalTitle
      }, 1000)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="h-10 px-4 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer print:hidden"
      title="Print receipt or save as PDF"
    >
      <Printer className="w-4 h-4" />
      <span>Print / PDF</span>
    </button>
  )
}
