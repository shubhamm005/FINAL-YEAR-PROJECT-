import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase middleware client — refreshes the auth session on every request
 * and enforces route protection for /dashboard/* routes.
 *
 * Role-based redirects:
 *  - Unauthenticated → /auth/sign-in
 *  - HOD  → /dashboard/overview  (full access)
 *  - Teacher → /dashboard/overview  (filtered access via use-nav.ts)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Refresh session — must not run other logic between createServerClient and getUser.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect all /dashboard/* routes
  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/auth');

  if (isDashboard && !user) {
    // Not signed in → redirect to sign-in
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/sign-in';
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && user) {
    // Already signed in → redirect to dashboard
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard/overview';
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
