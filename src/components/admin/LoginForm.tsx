'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/admin/login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 px-4 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 cursor-pointer"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Authenticating...</span>
        </>
      ) : (
        'Sign In to Admin Dashboard'
      )}
    </button>
  )
}

export default function LoginForm() {
  const [state, dispatch] = useActionState(login, undefined)
  const errorMessage = typeof state === 'string' ? state : state?.error

  return (
    <div className="w-full">
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm text-center font-medium animate-fade-in">
          {errorMessage}
        </div>
      )}

      <form className="space-y-5" action={dispatch}>
        <div>
          <label htmlFor="email-address" className="block text-xs font-bold uppercase tracking-widest text-gray-700 mb-1.5">
            Admin Email Address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none text-sm transition-all"
            placeholder="admin@kazicanvas.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none text-sm transition-all invisible-password-input"
          />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input
              id="remember-me"
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black/20 focus:ring-offset-0 cursor-pointer accent-black transition-colors"
            />
            <span className="text-xs font-medium text-gray-700 group-hover:text-black transition-colors">
              Remember me
            </span>
          </label>
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
