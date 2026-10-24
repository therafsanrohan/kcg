import QRCode from 'qrcode'

/**
 * Generates an optimized Data URL for a scannable QR code linking to the verification page.
 */
export async function generateInvoiceQRCodeDataURL(verificationUrl: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#111827', // Deep gray-900 for high contrast
        light: '#FFFFFF',
      },
    })
    return dataUrl
  } catch (error) {
    console.error('Failed to generate invoice verification QR code:', error)
    return ''
  }
}
