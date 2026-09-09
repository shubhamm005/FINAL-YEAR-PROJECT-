import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/responsibilities/[id]/updates
 *
 * Returns the full update history for a responsibility, sorted newest first.
 * Only accessible by the HOD who created the responsibility.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Auth — HOD only
  const authClient = await createClient();
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.user_metadata?.role !== 'hod') {
    return NextResponse.json({ error: 'Forbidden — HOD only' }, { status: 403 });
  }

  const admin = createAdminClient();

  // 2. Verify the responsibility belongs to this HOD
  const { data: resp } = await admin
    .from('responsibilities')
    .select('id, title, created_by')
    .eq('id', id)
    .single();

  if (!resp || resp.created_by !== user.id) {
    return NextResponse.json({ error: 'Responsibility not found' }, { status: 404 });
  }

  // 3. Fetch update log joined with teacher profile
  const { data, error } = await admin
    .from('responsibility_updates')
    .select(`
      id,
      responsibility_id,
      teacher_id,
      task_status,
      progress,
      remarks,
      attachment_url,
      created_at,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('responsibility_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updates = (data ?? []).map((row: any) => ({
    id: row.id,
    responsibility_id: row.responsibility_id,
    teacher_id: row.teacher_id,
    teacher_name: row.profiles?.full_name ?? null,
    teacher_email: row.profiles?.email ?? null,
    teacher_avatar: row.profiles?.avatar_url ?? null,
    task_status: row.task_status,
    progress: row.progress ?? 0,
    remarks: row.remarks,
    attachment_url: row.attachment_url,
    created_at: row.created_at
  }));

  return NextResponse.json({
    responsibility_id: resp.id,
    title: resp.title,
    updates
  });
}
