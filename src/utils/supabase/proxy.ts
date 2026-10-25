import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_REMEMBER_MAX_AGE, REMEMBER_ME_COOKIE_NAME } from "./server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const host = request.headers.get('host') || ''
  const isAppSubdomain = host.startsWith('app.')

  // If user accesses via app.kazicanvasgallery.com subdomain:
  // Root '/' goes directly to admin dashboard/login
  if (isAppSubdomain && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isLoginPath = request.nextUrl.pathname === '/admin/login';

  // Apply strict security headers on all admin responses
  if (isAdminPath) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    supabaseResponse.headers.set('Pragma', 'no-cache');
  }

  // Determine if Remember Me was selected for this session
  const isRemembered = request.cookies.get(REMEMBER_ME_COOKIE_NAME)?.value === 'true';

  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Key are required to create a client.");
    }

    const supabase = createServerClient(
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
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });

            // Re-apply security headers on newly created response
            if (isAdminPath) {
              supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
              supabaseResponse.headers.set('Pragma', 'no-cache');
            }

            cookiesToSet.forEach(({ name, value, options }) => {
              if (options?.maxAge === 0) {
                // Explicit deletion
                supabaseResponse.cookies.set(name, value, {
                  ...options,
                  maxAge: 0,
                  expires: new Date(0),
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } else if (isRemembered) {
                // Persistent session cookie across browser restarts
                const maxAge = options?.maxAge ?? ADMIN_REMEMBER_MAX_AGE;
                supabaseResponse.cookies.set(name, value, {
                  ...options,
                  maxAge,
                  expires: new Date(Date.now() + maxAge * 1000),
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } else {
                // Non-persistent session cookie (cleared when browser closes)
                supabaseResponse.cookies.set(name, value, {
                  path: options?.path ?? '/',
                  sameSite: (options?.sameSite as any) ?? 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              }
            });
          },
        },
      },
    );

    // Cryptographically verify session token with Supabase Auth backend
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If authenticated admin visits /admin/login, forward to /admin dashboard
    if (isLoginPath && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    // If unauthenticated visitor attempts to access protected /admin route, redirect to login
    if (isAdminPath && !isLoginPath) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Supabase Proxy Auth Check Error:", error instanceof Error ? error.message : "Unknown error");

    if (isAdminPath && !isLoginPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }
}
