import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const authClient = await createClient();
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.user_metadata?.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden — teachers only' }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data, error } = await admin
    .from('responsibility_assignments')
    .select(`
      assigned_at,
      responsibilities (
        id, title, description, category, priority,
        task_status, progress, due_date, remarks,
        attachment_url, status, created_at
      )
    `)
    .eq('teacher_id', user.id)
    .order('assigned_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const responsibilities = (data ?? [])
    .filter((row: any) => row.responsibilities !== null)
    .map((row: any) => ({
      id: row.responsibilities.id,
      title: row.responsibilities.title,
      description: row.responsibilities.description,
      category: row.responsibilities.category,
      priority: row.responsibilities.priority,
      task_status: row.responsibilities.task_status,
      progress: row.responsibilities.progress ?? 0,
      due_date: row.responsibilities.due_date,
      remarks: row.responsibilities.remarks,
      attachment_url: row.responsibilities.attachment_url,
      status: row.responsibilities.status,
      created_at: row.responsibilities.created_at,
      assigned_at: row.assigned_at
    }));

  return NextResponse.json({ responsibilities });
}
