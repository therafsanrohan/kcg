'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export interface ProfileUpdatePayload {
  full_name?: string
  username?: string
  phone?: string
  avatar_url?: string
}

/**
 * Returns a privileged Supabase client using SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively on the server side for Super Admin administrative user provisioning and management.
 */
function getAdminServiceClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
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
        // Ignore column check error if table not yet migrated
      }
    }

    // 1. Update user profile in Supabase Auth user_metadata
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

    // 2. Update admin_users profile columns
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
 * 4. Creates user in Supabase Auth via Admin Service Client with email confirmed.
 * 5. Inserts profile record into public.admin_users.
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
    const confirmPassword = (formData.get('confirm_password') as string)?.trim()
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

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'The new administrator passwords do not match. Please verify and re-type.' }
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
    const adminServiceClient = getAdminServiceClient()

    if (!adminServiceClient) {
      return {
        success: false,
        error:
          'Server configuration notice: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required on the server to provision administrator accounts directly in Supabase. Please configure this key in your server environment variables.',
      }
    }

    // Create user in Supabase Auth with email confirmed so they can log in immediately
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
        error: `Failed to create user in Supabase Auth: ${createError.message}`,
      }
    }

    const createdAuthUserId = createData.user?.id
    if (!createdAuthUserId) {
      return {
        success: false,
        error: 'Failed to retrieve the new administrator ID from Supabase Auth.',
      }
    }

    // 6. Record Profile in public.admin_users using admin service client
    const profilePayload: Record<string, any> = {
      id: createdAuthUserId,
      email: newEmail,
      role,
      full_name: fullName,
      username,
      phone,
      updated_at: new Date().toISOString(),
    }

    const { error: insertProfileErr } = await adminServiceClient
      .from('admin_users')
      .upsert(profilePayload, { onConflict: 'id' })

    if (insertProfileErr) {
      console.error('Failed to insert admin_users profile record:', insertProfileErr)
      // Rollback orphan auth user to avoid inconsistent state
      await adminServiceClient.auth.admin.deleteUser(createdAuthUserId)
      return {
        success: false,
        error: `Database profile creation failed: ${insertProfileErr.message}`,
      }
    }

    console.log(`[Security Audit] Super Admin successfully created new admin account: ${newEmail} (Role: ${role})`)

    revalidatePath('/admin/profile')

    return {
      success: true,
      message: `Administrator account for "${newEmail}" has been created successfully! They can now log in at /admin/login.`,
    }
  } catch (err: any) {
    console.error('createAdminAccount error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during account creation.',
    }
  }
}

/**
 * Super Admin privilege action: Updates another administrator's profile details & role.
 */
export async function updateAdminProfileBySuperAdmin(prevState: any, formData: FormData) {
  try {
    const { supabase, user, adminRecord } = await requireAdmin()

    if (adminRecord.role !== 'superadmin') {
      return {
        success: false,
        error: 'Forbidden: Only a Super Admin can manage administrator accounts.',
      }
    }

    const targetAdminId = (formData.get('target_admin_id') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim() || null
    const username = (formData.get('username') as string)?.trim().toLowerCase() || null
    const phone = (formData.get('phone') as string)?.trim() || null
    const role = (formData.get('role') as string)?.trim().toLowerCase() || 'admin'

    if (!targetAdminId) {
      return { success: false, error: 'Target administrator ID is missing.' }
    }

    if (role !== 'admin' && role !== 'superadmin') {
      return { success: false, error: 'Invalid role specified.' }
    }

    // Prevent demoting oneself if no other superadmin exists
    if (targetAdminId === user.id && role !== 'superadmin') {
      const { data: superAdmins } = await supabase
        .from('admin_users')
        .select('id')
        .eq('role', 'superadmin')

      if (!superAdmins || superAdmins.length <= 1) {
        return {
          success: false,
          error: 'Security barrier: Cannot demote the primary Super Admin when no other Super Admin exists.',
        }
      }
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

      const { data: existingUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .neq('id', targetAdminId)
        .maybeSingle()

      if (existingUser) {
        return {
          success: false,
          error: 'This username is already taken by another administrator.',
        }
      }
    }

    const adminServiceClient = getAdminServiceClient()
    const dbClient = adminServiceClient || supabase

    // 1. Update public.admin_users
    const updatePayload: Record<string, any> = {
      full_name: fullName,
      username,
      phone,
      role,
      updated_at: new Date().toISOString(),
    }

    const { error: updateErr } = await dbClient
      .from('admin_users')
      .update(updatePayload)
      .eq('id', targetAdminId)

    if (updateErr) {
      console.error('Failed to update admin profile:', updateErr)
      return {
        success: false,
        error: `Database update failed: ${updateErr.message}`,
      }
    }

    // 2. Also update auth user metadata if service client available
    if (adminServiceClient) {
      await adminServiceClient.auth.admin.updateUserById(targetAdminId, {
        user_metadata: {
          full_name: fullName,
          username,
          phone,
          role,
        },
      })
    }

    console.log(`[Security Audit] Super Admin updated profile for admin ${targetAdminId}`)

    revalidatePath('/admin/profile')
    return {
      success: true,
      message: 'Administrator profile has been updated successfully.',
    }
  } catch (err: any) {
    console.error('updateAdminProfileBySuperAdmin error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating admin profile.',
    }
  }
}

/**
 * Super Admin privilege action: Directly sets a new password for an administrator.
 * Requires reauthentication with the Super Admin's current password.
 */
export async function setAdminPasswordBySuperAdmin(prevState: any, formData: FormData) {
  try {
    const { supabase, user, adminRecord } = await requireAdmin()

    if (adminRecord.role !== 'superadmin') {
      return {
        success: false,
        error: 'Forbidden: Only a Super Admin can set administrator passwords.',
      }
    }

    const targetAdminId = (formData.get('target_admin_id') as string)?.trim()
    const newPassword = (formData.get('new_password') as string)?.trim()
    const confirmPassword = (formData.get('confirm_password') as string)?.trim()
    const superAdminPassword = formData.get('super_admin_password') as string

    if (!targetAdminId) {
      return { success: false, error: 'Target administrator ID is missing.' }
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A password of at least 6 characters is required.' }
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'The new passwords do not match. Please re-enter.' }
    }

    if (!superAdminPassword) {
      return { success: false, error: 'Please enter your Super Admin password to authorize this change.' }
    }

    // Reauthenticate Super Admin
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: superAdminPassword,
    })

    if (reauthError) {
      return {
        success: false,
        error: 'Identity verification failed: Incorrect Super Admin password.',
      }
    }

    const adminServiceClient = getAdminServiceClient()
    if (!adminServiceClient) {
      return {
        success: false,
        error: 'Server configuration notice: SUPABASE_SECRET_KEY is required to set user passwords directly.',
      }
    }

    const { error: updateAuthErr } = await adminServiceClient.auth.admin.updateUserById(
      targetAdminId,
      { password: newPassword }
    )

    if (updateAuthErr) {
      return {
        success: false,
        error: `Failed to set new password: ${updateAuthErr.message}`,
      }
    }

    console.log(`[Security Audit] Super Admin set new password for admin ${targetAdminId}`)

    revalidatePath('/admin/profile')
    return {
      success: true,
      message: 'New password has been set successfully for this administrator.',
    }
  } catch (err: any) {
    console.error('setAdminPasswordBySuperAdmin error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred.',
    }
  }
}

/**
 * Super Admin privilege action: Permanently deletes/revokes an administrator account.
 * Requires reauthentication with the Super Admin's current password.
 * Super Admins cannot delete their own account.
 */
export async function deleteAdminAccount(prevState: any, formData: FormData) {
  try {
    const { supabase, user, adminRecord } = await requireAdmin()

    if (adminRecord.role !== 'superadmin') {
      return {
        success: false,
        error: 'Forbidden: Only a Super Admin can remove administrator accounts.',
      }
    }

    const targetAdminId = (formData.get('target_admin_id') as string)?.trim()
    const superAdminPassword = formData.get('super_admin_password') as string

    if (!targetAdminId) {
      return { success: false, error: 'Target administrator ID is missing.' }
    }

    if (targetAdminId === user.id) {
      return {
        success: false,
        error: 'Security barrier: You cannot delete your own Super Admin account.',
      }
    }

    if (!superAdminPassword) {
      return { success: false, error: 'Please enter your Super Admin password to authorize deletion.' }
    }

    // Reauthenticate Super Admin
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: superAdminPassword,
    })

    if (reauthError) {
      return {
        success: false,
        error: 'Identity verification failed: Incorrect Super Admin password.',
      }
    }

    const adminServiceClient = getAdminServiceClient()
    const dbClient = adminServiceClient || supabase

    // 1. Delete from public.admin_users
    const { error: deleteDbErr } = await dbClient
      .from('admin_users')
      .delete()
      .eq('id', targetAdminId)

    if (deleteDbErr) {
      console.error('Failed to remove admin from database:', deleteDbErr)
      return {
        success: false,
        error: `Database removal failed: ${deleteDbErr.message}`,
      }
    }

    // 2. Delete from Supabase Auth if service client is available
    if (adminServiceClient) {
      const { error: deleteAuthErr } = await adminServiceClient.auth.admin.deleteUser(targetAdminId)
      if (deleteAuthErr) {
        console.warn('Note: Could not delete user from auth.users:', deleteAuthErr.message)
      }
    }

    console.log(`[Security Audit] Super Admin deleted admin account ${targetAdminId}`)

    revalidatePath('/admin/profile')
    return {
      success: true,
      message: 'Administrator account has been permanently removed.',
    }
  } catch (err: any) {
    console.error('deleteAdminAccount error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while deleting administrator account.',
    }
  }
}
