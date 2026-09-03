'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('Attempting login with email:', data.email)
  console.log('Password length:', data.password?.length)

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return error.message
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

export async function logout() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/admin/login')
}
