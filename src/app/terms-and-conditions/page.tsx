import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Kazi Canvas Gallery',
  description:
    'Review the official Terms & Conditions for Kazi Canvas Gallery, covering product delivery inspection, returns, exchanges, damaged items, and customer rights.',
  openGraph: {
    title: 'Terms & Conditions | Kazi Canvas Gallery',
    description:
      'Review the official Terms & Conditions for Kazi Canvas Gallery, covering product delivery inspection, returns, exchanges, damaged items, and customer rights.',
    type: 'website',
  },
}

export const revalidate = 86400 // Revalidate once daily or on-demand

export default function TermsAndConditionsPage() {
  const sections = [
    {
      id: 'product-inspection',
      number: '1',
      title: 'Product Inspection Upon Delivery',
      content:
        'Customers are requested to carefully inspect their product in the presence of our delivery agent at the time of delivery. Please check the artwork, size, frame, and overall condition before confirming receipt.',
    },
    {
      id: 'returns-and-exchanges',
      number: '2',
      title: 'Returns and Exchanges',
      content:
        'Once the product has been inspected and delivery is confirmed, returns or exchanges will not be accepted for change of mind, personal preference, or reasons unrelated to product defects or delivery damage, subject to applicable consumer protection laws.',
    },
    {
      id: 'damaged-defective-or-incorrect-products',
      number: '3',
      title: 'Damaged, Defective, or Incorrect Products',
      content:
        'If you receive a damaged, defective, or incorrect product, notify our delivery agent immediately and contact Kazi Canvas Gallery as soon as possible. Retain the product and its packaging, and provide photographs or other evidence if requested. We will review the issue and determine an appropriate resolution in accordance with our applicable policies and consumer protection laws.',
    },
    {
      id: 'customised-orders',
      number: '4',
      title: 'Customised Orders',
      content:
        'Customised or made-to-order products may not be eligible for cancellation, return, or exchange once production has started, except where required by applicable law or where the product is defective or incorrectly supplied.',
    },
    {
      id: 'delivery-confirmation',
      number: '5',
      title: 'Delivery Confirmation',
      content:
        'The customer or an authorised recipient should inspect the product and confirm receipt at the time of delivery. Any visible damage, incorrect item, or other concern should be reported promptly.',
    },
    {
      id: 'order-details',
      number: '6',
      title: 'Order Details',
      content:
        'Customers are responsible for checking the selected artwork, dimensions, frame option, and other order details before confirming their purchase. Please contact our team if clarification is needed.',
    },
    {
      id: 'consumer-rights',
      number: '7',
      title: 'Consumer Rights',
      content:
        'Nothing in these Terms & Conditions is intended to exclude or limit any rights customers may have under applicable consumer protection laws in Bangladesh.',
    },
    {
      id: 'acceptance-of-terms',
      number: '8',
      title: 'Acceptance of Terms',
      content:
        'By placing an order with Kazi Canvas Gallery, customers acknowledge that they have had the opportunity to review these Terms & Conditions, subject to applicable laws and consumer rights.',
    },
    {
      id: 'policy-updates',
      number: '9',
      title: 'Policy Updates',
      content:
        'Kazi Canvas Gallery may update these Terms & Conditions when necessary. The latest version will be published on this page.',
    },
  ]

  return (
    <div className="bg-[#FAF9F5] min-h-[calc(100vh-140px)]">
      {/* ── Breadcrumb Navigation ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span className="mx-2.5 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Terms &amp; Conditions</span>
        </nav>
      </div>

      {/* ── Editorial Header ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 sm:pb-12 border-b border-gray-200/80">
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-gray-500 font-medium">
            Kazi Canvas Gallery
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-gray-950 tracking-tight leading-[1.12]">
            Terms &amp; Conditions
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-light leading-relaxed pt-1">
            Please read these terms carefully before placing an order. They outline our commitments, delivery inspection requirements, returns, and your rights as a collector of our original artwork.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-gray-500 font-mono">
            <ShieldCheck className="h-4 w-4 text-gray-600" />
            <span>Effective &amp; updated: 2026 &bull; Authentic handmade artwork</span>
          </div>
        </div>
      </section>

      {/* ── Policy Sections List ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="space-y-8 sm:space-y-10">
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-24 p-6 sm:p-8 rounded-2xl bg-white/70 border border-gray-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors hover:border-gray-300"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-900 text-xs font-mono font-semibold">
                  {section.number}
                </span>
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-medium text-gray-950 tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── Inquiries & Contact CTA ── */}
        <div className="mt-16 p-8 sm:p-10 rounded-2xl bg-[#1A1A1A] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-medium tracking-tight">Have any questions about an artwork?</h3>
            <p className="text-sm text-gray-300 font-light max-w-xl">
              Our team is happy to assist you with artwork specifications, custom sizes, framing inquiries, or delivery arrangements.
            </p>
          </div>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-white text-gray-950 text-xs font-medium uppercase tracking-[0.2em] hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <span>Explore Collection</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
