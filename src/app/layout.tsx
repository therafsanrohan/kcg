import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { parseAnnouncementSettings } from '@/types/contact';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Kazi Canvas Gallery | Original Handmade Canvas Art",
  description: "Discover original, breathtaking oil and acrylic paintings crafted by Kazi Canvas Gallery. Elevate your living and work space with authentic, timeless art directly from the artist.",
  keywords: ["art gallery", "canvas painting", "oil painting", "acrylic art", "dhaka art", "bangladesh art gallery", "fine art"],
  openGraph: {
    title: "Kazi Canvas Gallery | Original Handmade Canvas Art",
    description: "Discover original, breathtaking oil and acrylic paintings crafted by Kazi Canvas Gallery.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: settings } = await supabase
    .from('site_settings')
    .select('whatsapp_number, social_links')
    .single()
    
  const whatsappNumber = settings?.whatsapp_number || '8801824951514'
  const announcementSettings = parseAnnouncementSettings(settings)

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PKC4K558');
          `}
        </Script>
        {/* End Google Tag Manager */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '2193628051585644');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2193628051585644&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-[#FAF9F5] text-[#1A1A1A] selection:bg-[#EAE8E3]">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PKC4K558"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <div className="gallery-grain-overlay" aria-hidden="true" />
        <AnnouncementBar settings={announcementSettings} />
        <Navbar whatsappNumber={whatsappNumber} />
        <main className="flex-1">
          {children}
        </main>
        <Footer whatsappNumber={whatsappNumber} />
      </body>
    </html>
  );
}
