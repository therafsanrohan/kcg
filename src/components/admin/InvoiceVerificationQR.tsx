import Image from 'next/image'
import { QrCode, ShieldCheck } from 'lucide-react'

interface InvoiceVerificationQRProps {
  qrDataUrl: string
  verificationUrl: string
  invoiceNumber: string
}

export default function InvoiceVerificationQR({
  qrDataUrl,
  verificationUrl,
  invoiceNumber,
}: InvoiceVerificationQRProps) {
  if (!qrDataUrl) return null

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200/80 max-w-sm">
      <div className="bg-white p-1.5 rounded-xl border border-gray-200/90 shadow-2xs flex-shrink-0">
        <Image
          src={qrDataUrl}
          alt={`Scan to verify Invoice #${invoiceNumber}`}
          width={84}
          height={84}
          className="w-[84px] h-[84px] object-contain rounded-lg"
          unoptimized
        />
      </div>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 tracking-tight">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Scan to Verify Invoice</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-tight">
          Scan with any smartphone camera to verify authenticity and current payment status on our official website.
        </p>
        <div className="pt-0.5">
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-600 hover:text-black font-mono underline underline-offset-2 truncate block"
          >
            {verificationUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>
    </div>
  )
}
