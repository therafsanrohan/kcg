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

      // Check if username is already taken by another admin
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
    }

    // Explicitly update ONLY permitted non-sensitive fields
    const updatePayload: Record<string, any> = {
      full_name: fullName,
      username,
      phone,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('admin_users')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update admin profile:', updateError)
      return {
        success: false,
        error: updateError.message || 'Failed to update profile.',
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
