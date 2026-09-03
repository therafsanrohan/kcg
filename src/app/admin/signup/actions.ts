'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function signup(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email inbox to confirm your account, then you can log in!' }
}
