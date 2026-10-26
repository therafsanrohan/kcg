import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Kazi Canvas Gallery',
  description:
    'Learn how Kazi Canvas Gallery respects and protects your personal information. We do not sell your personal data to third parties.',
  openGraph: {
    title: 'Privacy Policy | Kazi Canvas Gallery',
    description:
      'Learn how Kazi Canvas Gallery respects and protects your personal information. We do not sell your personal data to third parties.',
    type: 'website',
  },
}

export const revalidate = 86400 // Revalidate once daily or on-demand

export default function PrivacyPolicyPage() {
  const sections = [
    {
      id: 'commitment-to-privacy',
      number: '1',
      title: 'Our Commitment to Your Privacy',
      content:
        'At Kazi Canvas Gallery, we respect your privacy and are committed to handling your personal information responsibly. We take reasonable measures to protect customer information and use it only for legitimate business purposes, in accordance with applicable laws.',
    },
    {
      id: 'information-we-collect',
      number: '2',
      title: 'Information We May Collect',
      content:
        'Depending on how you interact with us, we may collect information such as your name, contact details, delivery address, order information, transaction-related records, customer support messages, and other information you voluntarily provide. We may also process limited information necessary to operate, maintain, and protect our website. We aim to collect only information reasonably necessary for the relevant purpose.',
    },
    {
      id: 'how-we-use-information',
      number: '3',
      title: 'How We Use Your Information',
      content:
        'We may use your information to process and fulfil orders, arrange deliveries, communicate order updates, respond to enquiries, provide customer support, maintain necessary business records, prevent fraud, protect our services, and meet applicable legal obligations. We aim to use personal information only for legitimate and relevant purposes.',
    },
    {
      id: 'we-do-not-sell-information',
      number: '4',
      title: 'We Do Not Sell Your Personal Information',
      isHighlight: true,
      content:
        "Kazi Canvas Gallery does not sell, rent, or trade customers' personal information to third parties for their marketing purposes. Your personal information is not a product for sale. We respect your privacy and are committed to handling your information responsibly. We do not sell customer information to data brokers or permit its sale for unrelated commercial marketing purposes.",
    },
    {
      id: 'responsible-information-sharing',
      number: '5',
      title: 'Limited and Responsible Information Sharing',
      content:
        'We may share limited information with authorised service providers or relevant parties when reasonably necessary to process payments, fulfil orders, arrange deliveries, provide customer support, or carry out essential business operations. We may also disclose information when required by law or when reasonably necessary to protect customers, prevent fraud, address security incidents, or protect legal rights. Where information sharing is necessary, we aim to limit it to what is reasonably required for the relevant purpose. We do not authorise service providers to use customer information beyond their permitted role, subject to applicable arrangements and laws.',
    },
    {
      id: 'how-we-protect-information',
      number: '6',
      title: 'How We Protect Your Information',
      content:
        'We take reasonable organisational and security measures designed to protect personal information against unauthorised access, misuse, alteration, disclosure, and loss. Access to customer information should be limited to authorised individuals who need it for legitimate business purposes. Although we take privacy and security seriously, no method of electronic transmission or storage can be guaranteed to be completely secure. We work to handle information responsibly and address potential risks appropriately.',
    },
    {
      id: 'data-retention',
      number: '7',
      title: 'How Long We Retain Information',
      content:
        'We retain personal information for as long as reasonably necessary to fulfil orders, provide services, resolve disputes, maintain required business records, and meet applicable legal obligations. When information is no longer needed, we aim to securely delete or anonymise it where reasonably practicable, subject to applicable retention requirements.',
    },
    {
      id: 'your-privacy-rights',
      number: '8',
      title: 'Your Privacy Rights',
      content:
        'Subject to applicable law, you may request access to your personal information, correction of inaccurate information, or deletion of information that we are not legally required or otherwise permitted to retain. You may also raise concerns about how your information is handled or withdraw consent where processing is based on consent. We may need to verify your identity before responding to certain requests. We will review legitimate requests in accordance with applicable laws.',
    },
    {
      id: 'cookies-preferences',
      number: '9',
      title: 'Cookies and Website Preferences',
      content:
        'Our website may use essential technologies or similar mechanisms to support website functionality, maintain security, and remember relevant preferences. Where non-essential cookies or similar technologies are used, we will provide appropriate notices or choices where required by applicable law.',
    },
    {
      id: 'third-party-services',
      number: '10',
      title: 'Third-Party Websites and Services',
      content:
        'Our website may contain links to external websites or rely on external services for certain business functions. Those services may have their own privacy practices. Customers should review the relevant policies when interacting with third-party services.',
    },
    {
      id: 'childrens-privacy',
      number: '11',
      title: "Children's Privacy",
      content:
        "Our services are not knowingly intended to collect children's personal information in violation of applicable law. If we become aware that information has been collected unlawfully from a child, we will take appropriate steps as required by applicable law.",
    },
    {
      id: 'policy-changes',
      number: '12',
      title: 'Changes to This Policy',
      content:
        'We may update this Privacy Policy when our business practices or legal obligations change. The latest version will be published on this page.',
    },
    {
      id: 'contact-us',
      number: '13',
      title: 'Contact Us',
      content:
        'For questions, privacy concerns, or requests relating to personal information, please contact Kazi Canvas Gallery using the official contact details published on our website. We will review privacy-related enquiries and respond as appropriate under applicable law.',
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
          <span className="text-gray-900 font-medium">Privacy Policy</span>
        </nav>
      </div>

      {/* ── Editorial Header ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 sm:pb-12 border-b border-gray-200/80">
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-gray-500 font-medium">
            Kazi Canvas Gallery
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-gray-950 tracking-tight leading-[1.12]">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-light leading-relaxed pt-1">
            We value your trust and are committed to protecting your privacy. This policy explains how we collect, use, and responsibly safeguard your personal information when you visit our gallery or place an order.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-500 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gray-700" />
              <span>We do not sell personal data</span>
            </div>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-gray-700" />
              <span>Responsible customer protection</span>
            </div>
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
              className={`scroll-mt-24 p-6 sm:p-8 rounded-2xl border transition-colors ${
                section.isHighlight
                  ? 'bg-stone-50/90 border-stone-300 shadow-[0_2px_6px_rgba(0,0,0,0.04)] ring-1 ring-stone-300'
                  : 'bg-white/70 border-gray-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono font-semibold ${
                    section.isHighlight
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
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
            <h3 className="text-lg font-medium tracking-tight">Questions about our privacy practices?</h3>
            <p className="text-sm text-gray-300 font-light max-w-xl">
              Our team is available to assist with any questions regarding your personal information, order security, or privacy rights.
            </p>
          </div>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-white text-gray-950 text-xs font-medium uppercase tracking-[0.2em] hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <span>Contact Us</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
