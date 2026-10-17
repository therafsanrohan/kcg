/**
 * Normalizes a phone number to standard international format for WhatsApp (wa.me)
 * and SMS links.
 * 
 * Rules:
 * - Strips all non-digit characters except leading '+' for analysis.
 * - Handles Bangladesh numbers:
 *   - '017XXXXXXXX' or '018XXXXXXXX' (11 digits with leading 0) -> '88017XXXXXXXX'
 *   - '+88017XXXXXXXX' or '88017XXXXXXXX' (13 digits) -> '88017XXXXXXXX'
 *   - '17XXXXXXXX' (10 digits starting with 13-19) -> '88017XXXXXXXX'
 * - Handles international numbers:
 *   - E.g. '+1 (415) 555-2671' -> '14155552671'
 * - Validates length and structural integrity (between 7 and 15 digits according to E.164).
 */
export function normalizeWhatsAppPhone(rawPhone?: string | null): {
  isValid: boolean
  formattedNumber: string
  error?: string
} {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      formattedNumber: '',
      error: 'Phone number is empty. Please enter a valid customer phone number.',
    }
  }

  const trimmed = rawPhone.trim()

  // Remove whitespace, dashes, parentheses, dots
  let digitsOnly = trimmed.replace(/[^\d+]/g, '')

  // Remove leading '+' if present
  if (digitsOnly.startsWith('+')) {
    digitsOnly = digitsOnly.slice(1)
  }

  // Remove any remaining non-digit characters
  digitsOnly = digitsOnly.replace(/\D/g, '')

  if (!digitsOnly) {
    return {
      isValid: false,
      formattedNumber: '',
      error: 'Invalid phone number format.',
    }
  }

  // 1. Bangladesh specific normalization
  // If starts with 880 followed by 1 and 9 digits (total 13 digits)
  if (digitsOnly.startsWith('880') && digitsOnly.length === 13) {
    return { isValid: true, formattedNumber: digitsOnly }
  }

  // If local BD format with leading zero: 01[3-9]XXXXXXXX (11 digits)
  if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
    return {
      isValid: true,
      formattedNumber: `880${digitsOnly.slice(1)}`, // 01712345678 -> 8801712345678
    }
  }

  // If BD format without leading zero: 1[3-9]XXXXXXXX (10 digits)
  if (digitsOnly.startsWith('1') && digitsOnly.length === 10) {
    return {
      isValid: true,
      formattedNumber: `880${digitsOnly}`,
    }
  }

  // 2. Generic International E.164 format (7 to 15 digits)
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return {
      isValid: true,
      formattedNumber: digitsOnly,
    }
  }

  return {
    isValid: false,
    formattedNumber: digitsOnly,
    error: 'Phone number must be between 7 and 15 digits in international format.',
  }
}

/**
 * Builds the canonical professional invoice message text for WhatsApp & sharing.
 */
export function buildInvoiceWhatsAppMessage(params: {
  customerName?: string
  invoiceNumber: string
  currency?: string
  grandTotal: number
  totalPaid: number
  remainingDue: number
  dueDate?: string | null
  publicInvoiceUrl: string
}): string {
  const {
    customerName = 'Valued Collector',
    invoiceNumber,
    currency = '৳',
    grandTotal,
    totalPaid,
    remainingDue,
    dueDate,
    publicInvoiceUrl,
  } = params

  const formattedTotal = `${currency}${Number(grandTotal).toLocaleString('en-BD')}`
  const formattedPaid = `${currency}${Number(totalPaid).toLocaleString('en-BD')}`
  const formattedDue = `${currency}${Number(remainingDue).toLocaleString('en-BD')}`

  return (
    `Hello ${customerName}, your Kazi Canvas Gallery invoice is ready.\n\n` +
    `Invoice: ${invoiceNumber}\n` +
    `Total: ${formattedTotal}\n` +
    `Paid: ${formattedPaid}\n` +
    `Outstanding: ${formattedDue}\n` +
    (dueDate ? `Due Date: ${dueDate}\n` : '') +
    `\nView & Verify Invoice:\n${publicInvoiceUrl}\n\n` +
    `Thank you,\nKazi Canvas Gallery`
  )
}
