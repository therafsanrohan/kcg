import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseSecret) {
      return NextResponse.json({ error: 'Missing Supabase secret keys in environment' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseSecret)

    // Attempt to create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@kcg.com',
      password: 'KcgAdminPassword123!',
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ message: 'Admin user already exists! You can now log in.' })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Success! Admin user created successfully. You can now log in.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
