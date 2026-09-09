import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/teachers
 *
 * Returns all profiles with role = 'teacher'.
 * Runs server-side with the authenticated session, so RLS on the
 * profiles table does not block the HOD from reading teacher rows.
 *
 * Guards:
 *  - Must be signed in
 *  - Must have role = 'hod' in their own profile
 */
export async function GET() {
  const supabase = await createClient();

  // 1. Verify caller is authenticated
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify caller is an HOD
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'hod') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Fetch all teacher profiles — uses the same authenticated session
  //    so Supabase RLS applies. The "Authenticated users can read teacher
  //    profiles" policy (added in the SQL migration) allows this read.
  const { data: teachers, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, created_at')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ teachers: teachers ?? [] });
}
