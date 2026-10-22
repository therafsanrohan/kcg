import React from 'react'
import { Phone, Mail, MapPin, Clock, ArrowUpRight } from 'lucide-react'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon'
import { FacebookIcon, InstagramIcon } from '@/components/ui/SocialIcons'
import { ContactSettings } from '@/types/contact'

interface ContactSectionProps {
  contact: ContactSettings
  className?: string
}

export default function ContactSection({ contact, className = '' }: ContactSectionProps) {
  const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : ''
  const cleanWhatsApp = contact.whatsapp ? contact.whatsapp.replace(/[^0-9]/g, '') : ''

  // Determine which items are active and eligible to display
  const showPhone = contact.phone_enabled && Boolean(contact.phone?.trim())
  const showWhatsApp = contact.whatsapp_enabled && Boolean(cleanWhatsApp)
  const showEmail = contact.email_enabled && Boolean(contact.email?.trim())
  const showAddress = contact.address_enabled && Boolean(contact.address?.trim())
  const showHours = contact.business_hours_enabled && Boolean(contact.business_hours?.trim())
  const showFacebook = contact.facebook_enabled && Boolean(contact.facebook_url?.trim())
  const showInstagram = contact.instagram_enabled && Boolean(contact.instagram_url?.trim())

  const hasDirectMethods = showPhone || showWhatsApp || showEmail
  const hasMeta = showAddress || showHours || showFacebook || showInstagram

  if (!hasDirectMethods && !hasMeta) {
    return null
  }

  return (
    <section
      id="contact"
      className={`border-t border-gray-200/80 bg-[#FAF9F5] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20 ${className}`}
      aria-labelledby="contact-heading"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Editorial Heading & Context */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.26em] text-gray-400 block">
              Direct Inquiries
            </span>
            <h2
              id="contact-heading"
              className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-gray-950 tracking-tight leading-[1.12]"
            >
              Let&rsquo;s find the right art for your space.
            </h2>
            <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed max-w-md pt-1">
              Have a question about our artwork, pricing, framing, or delivery? Get in touch with us. We&rsquo;re happy to help you find the right piece for your space.
            </p>

            {/* Social channels underneath introductory copy on larger screens */}
            {(showFacebook || showInstagram) && (
              <div className="pt-4 flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono">Follow our gallery:</span>
                <div className="flex items-center gap-2">
                  {showInstagram && (
                    <a
                      href={contact.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-black hover:border-black flex items-center justify-center transition-colors shadow-2xs"
                      aria-label="Official Instagram Profile"
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </a>
                  )}
                  {showFacebook && (
                    <a
                      href={contact.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-black hover:border-black flex items-center justify-center transition-colors shadow-2xs"
                      aria-label="Official Facebook Page"
                    >
                      <FacebookIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Direct Contact Channel Cards */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Primary Action: Direct WhatsApp Chat */}
            {showWhatsApp && (
              <a
                href={`https://wa.me/${cleanWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 hover:border-black transition-all shadow-2xs hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="h-12 w-12 rounded-xl bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <WhatsAppIcon className="h-6 w-6 fill-[#128C7E]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-0.5">
                      Fastest Response &bull; WhatsApp
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-gray-950 group-hover:text-black transition-colors">
                      Inquire & Consult via WhatsApp
                    </h3>
                    <p className="text-xs text-gray-500 font-light mt-0.5 font-mono">
                      +{cleanWhatsApp}
                    </p>
                  </div>
                </div>

                <div className="h-9 w-9 rounded-full bg-stone-50 border border-gray-200 group-hover:bg-black group-hover:text-white group-hover:border-black flex items-center justify-center transition-colors flex-shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </a>
            )}

            {/* Direct Phone Call */}
            {showPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="group flex items-center justify-between p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 hover:border-black transition-all shadow-2xs hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="h-12 w-12 rounded-xl bg-stone-100 text-gray-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-0.5">
                      Direct Voice Call
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-gray-950 group-hover:text-black transition-colors">
                      {contact.phone}
                    </h3>
                    <p className="text-xs text-gray-500 font-light mt-0.5">
                      Direct consultation with the gallery studio
                    </p>
                  </div>
                </div>

                <div className="h-9 w-9 rounded-full bg-stone-50 border border-gray-200 group-hover:bg-black group-hover:text-white group-hover:border-black flex items-center justify-center transition-colors flex-shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </a>
            )}

            {/* Direct Email */}
            {showEmail && (
              <a
                href={`mailto:${contact.email}`}
                className="group flex items-center justify-between p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 hover:border-black transition-all shadow-2xs hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="h-12 w-12 rounded-xl bg-stone-100 text-gray-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-0.5">
                      Official Gallery Email
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-gray-950 group-hover:text-black transition-colors break-all">
                      {contact.email}
                    </h3>
                    <p className="text-xs text-gray-500 font-light mt-0.5">
                      Send acquisition, corporate, or custom inquiries
                    </p>
                  </div>
                </div>

                <div className="h-9 w-9 rounded-full bg-stone-50 border border-gray-200 group-hover:bg-black group-hover:text-white group-hover:border-black flex items-center justify-center transition-colors flex-shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </a>
            )}

            {/* Studio Address & Business Hours Grid */}
            {(showAddress || showHours) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {showAddress && (
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-1">
                          Studio Location
                        </span>
                        <p className="text-sm font-medium text-gray-950 leading-relaxed whitespace-pre-line">
                          {contact.address}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {showHours && (
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <Clock className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-1">
                          Business Hours
                        </span>
                        <p className="text-sm font-medium text-gray-950 leading-relaxed whitespace-pre-line">
                          {contact.business_hours}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </section>
  )
}
