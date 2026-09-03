'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signup } from '@/app/admin/signup/actions'
import Link from 'next/link'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {pending ? 'Registering...' : 'Create Admin Account'}
    </button>
  )
}

export default function SignupPage() {
  const [state, dispatch] = useActionState(signup, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 shadow-sm rounded-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Kazi Canvas Gallery
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create Admin Account
          </p>
        </div>
        
        {state?.error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {state.error}
          </div>
        )}
        
        {state?.success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md text-sm text-center font-medium">
            {state.success}
          </div>
        )}
        
        <form className="mt-8 space-y-6" action={dispatch}>
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
                placeholder="Your real email address"
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
                autoComplete="new-password"
                required
                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                placeholder="Choose a password"
              />
            </div>
          </div>

          <div>
            <SubmitButton />
          </div>
          
          <div className="text-center mt-4">
            <Link href="/admin/login" className="text-sm text-blue-600 hover:underline">
              Already have an account? Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
