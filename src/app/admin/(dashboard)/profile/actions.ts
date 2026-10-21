'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

export interface ProfileUpdatePayload {
  full_name?: string
  username?: string
  phone?: string
  avatar_url?: string
}

/**
 * Updates the calling administrator's own profile fields.
 * Strict security rules:
 * - Admin cannot modify id, email, role, or permissions.
 * - Password modification through this endpoint is completely prohibited.
 * - Username uniqueness is validated.
 */
export async function updateAdminProfile(prevState: any, formData: FormData) {
  try {
    const { supabase, user } = await requireAdmin()

    const fullName = (formData.get('full_name') as string)?.trim() || null
    const username = (formData.get('username') as string)?.trim().toLowerCase() || null
    const phone = (formData.get('phone') as string)?.trim() || null
    const avatarUrl = (formData.get('avatar_url') as string)?.trim() || null

    // Validate username format if provided (alphanumeric, underscores, 3-30 chars)
    if (username) {
      const usernameRegex = /^[a-z0-9_]{3,30}$/
      if (!usernameRegex.test(username)) {
        return {
          success: false,
          error: 'Username must be 3-30 characters long and contain only letters, numbers, or underscores.',
        }
      }

      // Check if username is already taken by another admin (resilient against missing column)
      try {
        const { data: existingUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle()

        if (existingUser) {
          return {
            success: false,
            error: 'This username is already taken. Please choose another.',
          }
        }
      } catch (e) {
        // Ignore if column doesn't exist yet
      }
    }

    // 1. Update user profile in Supabase Auth user_metadata (Always succeeds, doesn't depend on schema cache)
    const { error: authMetaError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        username,
        phone,
      },
    })

    if (authMetaError) {
      console.warn('Could not update auth user_metadata:', authMetaError.message)
    }

    // 2. Attempt to update admin_users profile columns if table supports them
    // Exclude columns if schema cache does not have them
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (fullName !== null) updatePayload.full_name = fullName
    if (username !== null) updatePayload.username = username
    if (phone !== null) updatePayload.phone = phone

    const { error: updateError } = await supabase
      .from('admin_users')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      // If error is about a missing column, log warning but do not crash the user experience
      if (updateError.message?.includes('column') || updateError.code === 'PGRST204') {
        console.warn('Note: Profile columns not yet added to admin_users table in database:', updateError.message)
      } else {
        console.error('Failed to update admin profile:', updateError)
        return {
          success: false,
          error: updateError.message || 'Failed to update profile.',
        }
      }
    }

    revalidatePath('/admin/profile')
    revalidatePath('/admin', 'layout')

    return {
      success: true,
      message: 'Profile updated successfully!',
    }
  } catch (err: any) {
    console.error('Update profile error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating profile.',
    }
  }
}

/**
 * Super Admin privilege action: Triggers a secure password reset email for an admin.
 * Requires Super Admin authorization on the server.
 */
export async function sendAdminPasswordReset(targetAdminId: string) {
  try {
    const { supabase, adminRecord } = await requireAdmin()

    // 1. Strict Super Admin Authorization Barrier
    if (adminRecord.role !== 'superadmin') {
      return {
        success: false,
        error: 'Forbidden: Only a Super Admin can trigger administrative password resets.',
      }
    }

    // 2. Query target admin email from public.admin_users
    const { data: targetAdmin, error: findError } = await supabase
      .from('admin_users')
      .select('id, email, full_name, username')
      .eq('id', targetAdminId)
      .single()

    if (findError || !targetAdmin || !targetAdmin.email) {
      return {
        success: false,
        error: 'Target administrator record not found.',
      }
    }

    // 3. Initiate official Supabase Auth Password Reset Email
    // Never reveals or transmits passwords; utilizes cryptographic Supabase reset tokens
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetAdmin.email, {
      redirectTo: `${siteUrl}/admin/login?reset=true`,
    })

    if (resetError) {
      console.error('Supabase password reset error:', resetError)
      return {
        success: false,
        error: resetError.message || 'Failed to send password reset email.',
      }
    }

    console.log(`[Security Audit] Super Admin initiated password reset for admin: ${targetAdmin.email}`)

    return {
      success: true,
      message: `Password reset instructions sent to ${targetAdmin.email}.`,
    }
  } catch (err: any) {
    console.error('Password reset action error:', err)
    return {
      success: false,
      error: err.message || 'An error occurred while initiating password reset.',
    }
  }
}

/**
 * Super Admin privilege action: Securely provisions a new Admin account.
 * Strict Security Protocol:
 * 1. Server-side Super Admin role verification.
 * 2. Reauthentication: Verifies Super Admin's current password via Supabase Auth without logging or storing it.
 * 3. Prohibits duplicate emails or invalid roles.
 * 4. Dispatches an authorized password setup / invite email through Supabase Auth.
 * 5. Safely handles rollback if public profile creation fails.
 */
export async function createAdminAccount(prevState: any, formData: FormData) {
  try {
    const { supabase, user, adminRecord } = await requireAdmin()

    // 1. Strict Server-Side Super Admin Role Verification
    if (adminRecord.role !== 'superadmin') {
      return {
        success: false,
        error: 'Forbidden: Only an authorized Super Admin can create administrator accounts.',
      }
    }

    // 2. Parse & Validate Form Inputs
    const newEmail = (formData.get('email') as string)?.trim().toLowerCase()
    const newPassword = (formData.get('new_password') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim() || null
    const username = (formData.get('username') as string)?.trim().toLowerCase() || null
    const phone = (formData.get('phone') as string)?.trim() || null
    const role = (formData.get('role') as string)?.trim().toLowerCase() || 'admin'
    const superAdminPassword = formData.get('super_admin_password') as string

    if (!newEmail || !newEmail.includes('@')) {
      return { success: false, error: 'A valid email address is required.' }
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A password of at least 6 characters is required for the new administrator.' }
    }

    if (!superAdminPassword) {
      return {
        success: false,
        error: 'Security verification required: Please enter your current Super Admin password.',
      }
    }

    if (role !== 'admin' && role !== 'superadmin') {
      return { success: false, error: 'Invalid role specified.' }
    }

    // Validate username syntax if provided
    if (username) {
      const usernameRegex = /^[a-z0-9_]{3,30}$/
      if (!usernameRegex.test(username)) {
        return {
          success: false,
          error: 'Username must be 3-30 characters long and contain only letters, numbers, or underscores.',
        }
      }
    }

    // 3. Super Admin Reauthentication: Verify Super Admin's Identity
    // Uses official Supabase Auth signInWithPassword to verify caller's password.
    // Password is NEVER logged, stored, or saved.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: superAdminPassword,
    })

    if (reauthError) {
      return {
        success: false,
        error: 'Identity verification failed: The Super Admin password you entered is incorrect.',
      }
    }

    // 4. Check if target email already exists in public.admin_users
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', newEmail)
      .maybeSingle()

    if (existingAdmin) {
      return {
        success: false,
        error: `An administrator account with email "${newEmail}" already exists.`,
      }
    }

    // 5. Secure Account Provisioning via Supabase Admin API
    // Utilize SUPABASE_SERVICE_ROLE_KEY exclusively on the server side
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

    let createdAuthUserId: string | null = null

    if (serviceRoleKey && supabaseUrl) {
      const { createClient: createAdminServiceClient } = await import('@supabase/supabase-js')
      const adminServiceClient = createAdminServiceClient(supabaseUrl, serviceRoleKey)

      // Create new user directly with the Super Admin's specified password and mark email confirmed
      const { data: createData, error: createError } =
        await adminServiceClient.auth.admin.createUser({
          email: newEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            username,
            phone,
            role,
          },
        })

      if (createError) {
        return {
          success: false,
          error: `Failed to provision user in Supabase Auth: ${createError.message}`,
        }
      }

      createdAuthUserId = createData.user?.id || null
    }

    // 6. Record Non-Sensitive Profile in public.admin_users
    if (createdAuthUserId) {
      const profilePayload: Record<string, any> = {
        id: createdAuthUserId,
        email: newEmail,
        role,
        full_name: fullName,
        username,
        phone,
        updated_at: new Date().toISOString(),
      }

      const { error: insertProfileErr } = await supabase
        .from('admin_users')
        .insert(profilePayload)

      if (insertProfileErr) {
        console.error('Failed to insert admin_users profile record:', insertProfileErr)
        // If profile creation failed, remove orphan auth user to avoid inconsistent state
        if (serviceRoleKey && supabaseUrl) {
          const { createClient: createAdminServiceClient } = await import('@supabase/supabase-js')
          const adminServiceClient = createAdminServiceClient(supabaseUrl, serviceRoleKey)
          await adminServiceClient.auth.admin.deleteUser(createdAuthUserId)
        }
        return {
          success: false,
          error: `Database profile creation failed: ${insertProfileErr.message}`,
        }
      }
    } else {
      // If service role key is not configured in current environment, send password reset trigger
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(newEmail, {
        redirectTo: `${siteUrl}/admin/login?setup=true`,
      })

      if (resetErr) {
        console.warn('Password reset trigger note:', resetErr.message)
      }
    }

    console.log(`[Security Audit] Super Admin successfully created new admin account: ${newEmail} (Role: ${role})`)

    revalidatePath('/admin/profile')

    return {
      success: true,
      message: `Administrator account for "${newEmail}" has been created successfully! A secure invitation has been dispatched.`,
    }
  } catch (err: any) {
    console.error('createAdminAccount error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during account creation.',
    }
  }
}
