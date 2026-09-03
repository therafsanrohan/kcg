import Link from 'next/link'
import { Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110">
            <span className="sr-only">Facebook</span>
            <Facebook className="h-6 w-6" aria-hidden="true" />
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
