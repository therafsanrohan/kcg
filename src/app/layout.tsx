import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

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
    .select('whatsapp_number')
    .single()
    
  const whatsappNumber = settings?.whatsapp_number || '8801824951514'

  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <Navbar whatsappNumber={whatsappNumber} />
        <main className="flex-1">
          {children}
        </main>
        <Footer whatsappNumber={whatsappNumber} />
      </body>
    </html>
  );
}
