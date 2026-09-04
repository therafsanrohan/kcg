'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  
  // Safe normalization for email; exact preservation for password (no .trim())
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Please enter both your admin email and password.' }
  }

  // Validate that environment configuration exists
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Admin Auth Error]', {
      code: 'missing_environment_configuration',
      category: 'ConfigurationError',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    })
    return { error: 'Authentication service temporarily unavailable or misconfigured. Please check server settings.' }
  }

  try {
    const supabase = createClient(cookieStore)

    // 1. Authenticate user against Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      // Safe server logging with NO sensitive information (no passwords, tokens, or raw responses)
      console.error('[Admin Auth Error]', {
        status: authError?.status,
        code: (authError as any)?.code || authError?.name || 'unknown_auth_error',
        category: authError?.status === 400 ? 'ClientCredentials' : authError?.status === 429 ? 'RateLimit' : 'ServerError',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
      })

      // Customer-facing error categorization
      if (authError?.message?.toLowerCase().includes('email not confirmed') || (authError as any)?.code === 'email_not_confirmed') {
        return { error: 'Your email address has not been confirmed yet. Please verify your email.' }
      }

      if (authError?.status === 429 || authError?.message?.toLowerCase().includes('rate limit')) {
        return { error: 'Too many login attempts. Please wait a few moments and try again.' }
      }

      if (authError?.status && authError.status >= 500) {
        return { error: 'Authentication service temporarily unavailable. Please try again later.' }
      }

      return { error: 'Invalid email or password. Please check your credentials.' }
    }

    // 2. Separate Authorization step: Check if user exists in public.admin_users
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single()

    if (adminError || !adminRecord) {
      // Authenticated with Supabase Auth, but NOT an authorized administrator
      console.warn('[Admin Auth Warning]', {
        event: 'unauthorized_admin_access_attempt',
        maskedUserId: authData.user.id.slice(0, 8) + '-****-****-****-' + authData.user.id.slice(-4),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
      })
      await supabase.auth.signOut()
      return { error: 'Access denied: This account is not an authorized administrator.' }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/admin', 'layout')
  } catch (err: any) {
    console.error('[Admin Auth Unexpected Exception]', {
      name: err?.name || 'Error',
      category: 'UnhandledException',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    })
    return { error: 'An unexpected error occurred during login. Please try again.' }
  }

  redirect('/admin')
}

export async function logout() {
  const cookieStore = await cookies()
  try {
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
  } catch (err: any) {
    console.error('[Admin Logout Error]', {
      name: err?.name || 'Error',
      timestamp: new Date().toISOString(),
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/admin', 'layout')
  redirect('/admin/login')
}
