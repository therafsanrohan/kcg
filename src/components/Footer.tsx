import Link from 'next/link'

export default function Footer({ whatsappNumber }: { whatsappNumber?: string }) {
  return (
    <footer className="bg-white border-t border-gray-100 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110">
            <span className="sr-only">Facebook</span>
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
        <div className="mt-8 md:order-1 md:mt-0 flex flex-col items-center md:items-start space-y-2">
          <p className="text-center md:text-left text-xs leading-5 text-gray-500">
            &copy; {new Date().getFullYear()} Kazi Canvas Gallery. All rights reserved.
          </p>
          <p className="text-center md:text-left text-xs leading-5 text-gray-400">
            Developed by <a href="https://www.creatiancy.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-600 hover:text-black transition-colors">Creatiancy</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
