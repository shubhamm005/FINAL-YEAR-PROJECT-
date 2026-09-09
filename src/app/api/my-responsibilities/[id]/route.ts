import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/my-responsibilities/[id]
 *
 * Teacher updates task_status, progress, remarks, attachment_url.
 * Also inserts a snapshot row into responsibility_updates so the HOD
 * can see the full update history.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Auth
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

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowed = ['task_status', 'progress', 'remarks', 'attachment_url'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Validate
  if ('progress' in updates) {
    const p = Number(updates.progress);
    if (isNaN(p) || p < 0 || p > 100) {
      return NextResponse.json({ error: 'progress must be 0–100' }, { status: 400 });
    }
    updates.progress = p;
  }
  const validStatuses = ['pending', 'in_progress', 'completed', 'verified'];
  if ('task_status' in updates && !validStatuses.includes(updates.task_status as string)) {
    return NextResponse.json({ error: 'Invalid task_status value' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Verify teacher is assigned
  const { data: assignment } = await admin
    .from('responsibility_assignments')
    .select('teacher_id')
    .eq('responsibility_id', id)
    .eq('teacher_id', user.id)
    .single();

  if (!assignment) {
    return NextResponse.json(
      { error: 'You are not assigned to this responsibility' },
      { status: 403 }
    );
  }

  // 4. Update the responsibilities row
  const { error: updateError } = await admin.from('responsibilities').update(updates).eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 5. Fetch current full state to snapshot into update log
  const { data: current } = await admin
    .from('responsibilities')
    .select('task_status, progress, remarks, attachment_url')
    .eq('id', id)
    .single();

  // 6. Insert history log row
  const { error: logError } = await admin.from('responsibility_updates').insert({
    responsibility_id: id,
    teacher_id: user.id,
    task_status: current?.task_status ?? updates.task_status,
    progress: current?.progress ?? updates.progress ?? 0,
    remarks: current?.remarks ?? updates.remarks ?? null,
    attachment_url: current?.attachment_url ?? updates.attachment_url ?? null
  });

  if (logError) {
    // Non-fatal: update succeeded, just log the error
    console.error('[responsibility_updates insert]', logError.message);
  }

  return NextResponse.json({ success: true });
}
