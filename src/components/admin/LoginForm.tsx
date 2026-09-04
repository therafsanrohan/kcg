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
      className="flex w-full justify-center rounded-xl bg-black py-3 px-4 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
    >
      {pending ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
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
            className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none text-sm transition-all"
            placeholder="••••••••••••"
          />
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
