import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/my-responsibilities
 *
 * Returns all responsibilities assigned to the signed-in teacher.
 *
 * Pattern:
 *  1. Verify identity using the regular server client (honours RLS / session)
 *  2. Fetch data using the admin client (bypasses RLS entirely — safe because
 *     we already verified the caller is authenticated and is a teacher)
 */
export async function GET() {
  // ── 1. Verify the caller is a signed-in teacher ──────────────────────
  const authClient = await createClient();
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden — teachers only' }, { status: 403 });
  }

  // ── 2. Fetch with admin client — no RLS, no recursion ────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data, error } = await admin
    .from('responsibility_assignments')
    .select(
      `
      assigned_at,
      responsibilities (
        id,
        title,
        description,
        status,
        created_at
      )
    `
    )
    .eq('teacher_id', user.id)
    .order('assigned_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const responsibilities = (data ?? [])
    .filter((row: any) => row.responsibilities !== null)
    .map((row: any) => ({
      id: row.responsibilities.id,
      title: row.responsibilities.title,
      description: row.responsibilities.description,
      status: row.responsibilities.status,
      created_at: row.responsibilities.created_at,
      assigned_at: row.assigned_at
    }));

  return NextResponse.json({ responsibilities });
}
