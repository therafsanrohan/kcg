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
      className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  )
}

export default function LoginForm() {
  const [errorMessage, dispatch] = useActionState(login, undefined)

  return (
    <form className="mt-8 space-y-6" action={dispatch}>
      {errorMessage && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
          {errorMessage}
        </div>
      )}
      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <label htmlFor="email-address" className="sr-only">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            placeholder="Email address"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            placeholder="Password"
          />
        </div>
      </div>

      <div>
        <SubmitButton />
      </div>

      <div className="text-center mt-4">
        <a href="/admin/signup" className="text-sm text-blue-600 hover:underline">
          Don't have an account? Sign up here
        </a>
      </div>
    </form>
  )
}
