import type { Metadata, Viewport } from "next";
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
      <body className="min-h-screen flex flex-col font-sans bg-[#FAF9F5] text-[#1A1A1A] selection:bg-[#EAE8E3]">
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
