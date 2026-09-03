'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/admin/login/actions'

function SubmitButton({ text = 'Enter Admin Dashboard' }: { text?: string }) {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full justify-center rounded-xl bg-black py-3 px-4 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
    >
      {pending ? 'Verifying & Loading...' : text}
    </button>
  )
}

export default function LoginForm() {
  const [errorMessage, dispatch] = useActionState(login, undefined)
  const [useEmailMode, setUseEmailMode] = useState(false)

  return (
    <div className="w-full">
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center font-medium animate-fade-in">
          {errorMessage}
        </div>
      )}

      {!useEmailMode ? (
        /* Quick Passcode Mode (Super Easy) */
        <form className="space-y-6" action={dispatch}>
          <div>
            <label htmlFor="passcode" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Admin Passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              type="password"
              defaultValue="admin123"
              required
              autoFocus
              className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black sm:text-base font-mono tracking-wider transition-all"
              placeholder="Enter passcode (admin123)"
            />
            <p className="mt-2 text-xs text-gray-400">
              Default passcode: <span className="font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">admin123</span>
            </p>
          </div>

          <div>
            <SubmitButton text="Sign In with Passcode" />
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setUseEmailMode(true)}
              className="text-xs text-gray-500 hover:text-black underline transition-colors"
            >
              Or sign in with Email & Password
            </button>
          </div>
        </form>
      ) : (
        /* Email Mode */
        <form className="space-y-5" action={dispatch}>
          <div>
            <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Email Address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black sm:text-sm transition-all"
              placeholder="admin@kazicanvas.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black sm:text-sm transition-all"
              placeholder="Password"
            />
          </div>

          <div>
            <SubmitButton text="Sign In with Credentials" />
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setUseEmailMode(false)}
              className="text-xs text-gray-500 hover:text-black underline transition-colors"
            >
              Switch back to Quick Passcode (admin123)
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
