'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

const MASTER_PASSCODE = process.env.ADMIN_PASSCODE || 'admin123'

export async function login(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()
  const passcode = (formData.get('passcode') as string)?.trim()

  // 1. Check quick master passcode
  if (password === MASTER_PASSCODE || passcode === MASTER_PASSCODE || email === MASTER_PASSCODE) {
    cookieStore.set('kcg_admin_session', 'authenticated', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    revalidatePath('/', 'layout')
    redirect('/admin')
  }

  // 2. Otherwise try Supabase Auth
  if (email && password) {
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) {
      cookieStore.set('kcg_admin_session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      revalidatePath('/', 'layout')
      redirect('/admin')
    }
  }

  return 'Invalid passcode or credentials. Try entering passcode: admin123'
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('kcg_admin_session')
  
  try {
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
  } catch {
    // Ignore signout error if session was purely cookie-based
  }
  
  redirect('/admin/login')
}
