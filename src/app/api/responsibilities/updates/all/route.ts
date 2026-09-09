import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/responsibilities/updates/all
 *
 * Returns all update log entries for responsibilities created by the
 * signed-in HOD, newest first. Used in the HOD "Updates" tab.
 */
export async function GET() {
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

  // Get all responsibility IDs owned by this HOD
  const { data: ownedIds } = await admin
    .from('responsibilities')
    .select('id')
    .eq('created_by', user.id);

  if (!ownedIds || ownedIds.length === 0) {
    return NextResponse.json({ updates: [] });
  }

  const ids = ownedIds.map((r: any) => r.id);

  // Fetch all updates for those responsibilities, join responsibility title + teacher profile
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
      responsibilities ( title ),
      profiles ( full_name, email, avatar_url )
    `)
    .in('responsibility_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updates = (data ?? []).map((row: any) => ({
    id: row.id,
    responsibility_id: row.responsibility_id,
    responsibility_title: row.responsibilities?.title ?? null,
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

  return NextResponse.json({ updates });
}
