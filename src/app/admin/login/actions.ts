'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!email || !password) {
    return { error: 'Please enter both your admin email and password.' }
  }

  try {
    const supabase = createClient(cookieStore)

    // 1. Authenticate user against Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { error: 'Invalid email or password. Please check your credentials.' }
    }

    // 2. Check if user is registered in admin_users
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single()

    if (adminError || !adminRecord) {
      // User signed in but is not an authorized administrator
      await supabase.auth.signOut()
      return { error: 'Access denied: Your account does not have administrator privileges.' }
    }

    revalidatePath('/', 'layout')
  } catch (err: any) {
    console.error('Admin login error:', err)
    return { error: 'An unexpected error occurred during login. Please try again.' }
  }

  redirect('/admin')
}

export async function logout() {
  const cookieStore = await cookies()
  try {
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Logout error:', err)
  }

  redirect('/admin/login')
}
