import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Configurable admin persistent session lifetime when Remember Me is checked (default: 30 days)
export const ADMIN_REMEMBER_MAX_AGE =
  Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS) || 30 * 24 * 60 * 60;

export const REMEMBER_ME_COOKIE_NAME = 'kcg-admin-remember';

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  clientOptions?: { remember?: boolean }
) => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  // Determine whether this session should persist across browser restarts
  const isRemembered =
    clientOptions?.remember !== undefined
      ? clientOptions.remember
      : cookieStore.get(REMEMBER_ME_COOKIE_NAME)?.value === 'true';

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookieOptions: isRemembered
        ? {
            maxAge: ADMIN_REMEMBER_MAX_AGE,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          }
        : {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (options?.maxAge === 0) {
                // Explicit cookie deletion (e.g. signOut)
                cookieStore.set(name, value, {
                  ...options,
                  maxAge: 0,
                  expires: new Date(0),
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } else if (isRemembered) {
                // Persistent session across browser restarts
                const maxAge = options?.maxAge ?? ADMIN_REMEMBER_MAX_AGE;
                cookieStore.set(name, value, {
                  ...options,
                  maxAge,
                  expires: new Date(Date.now() + maxAge * 1000),
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } else {
                // Non-persistent session cookie (omits maxAge & expires so browser clears it upon exit)
                cookieStore.set(name, value, {
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              }
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};
