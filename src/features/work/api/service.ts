import { createClient } from '@/lib/supabase/client';
import type {
  Responsibility,
  ResponsibilitiesResponse,
  TeacherProfile,
  WorkFilters,
  CreateResponsibilityPayload,
  UpdateResponsibilityPayload,
  MyResponsibility
} from './types';

function supabase() {
  return createClient();
}

// ─── Responsibilities (HOD) ───────────────────────────────────────────────

export async function getResponsibilities(
  filters: WorkFilters = {}
): Promise<ResponsibilitiesResponse> {
  const db = supabase();

  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please sign in again.');

  let query = db
    .from('responsibilities')
    .select(`
      id, title, description, category, priority, task_status,
      progress, due_date, remarks, attachment_url, status,
      created_by, created_at, updated_at,
      responsibility_assignments (
        assigned_at,
        profiles ( id, full_name, email, avatar_url )
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.search) query = query.ilike('title', `%${filters.search}%`);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const responsibilities: Responsibility[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    task_status: row.task_status,
    progress: row.progress ?? 0,
    due_date: row.due_date,
    remarks: row.remarks,
    attachment_url: row.attachment_url,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assigned_teachers: (row.responsibility_assignments ?? []).map((a: any) => ({
      id: a.profiles?.id ?? '',
      full_name: a.profiles?.full_name ?? null,
      email: a.profiles?.email ?? null,
      avatar_url: a.profiles?.avatar_url ?? null,
      assigned_at: a.assigned_at
    }))
  }));

  return { responsibilities, total: responsibilities.length };
}

export async function getTeachers(): Promise<TeacherProfile[]> {
  const res = await fetch('/api/teachers', { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load teachers (${res.status})`);
  }
  const body = (await res.json()) as { teachers: TeacherProfile[] };
  return body.teachers;
}

export async function createResponsibility(
  payload: CreateResponsibilityPayload
): Promise<Responsibility> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: resp, error: respErr } = await db
    .from('responsibilities')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      category: payload.category,
      priority: payload.priority,
      due_date: payload.due_date ?? null,
      attachment_url: payload.attachment_url ?? null,
      created_by: user.id,
      status: 'active',
      task_status: 'pending',
      progress: 0
    })
    .select('*')
    .single();

  if (respErr) throw new Error(respErr.message);

  if (payload.teacherIds.length > 0) {
    const { error: aErr } = await db.from('responsibility_assignments').insert(
      payload.teacherIds.map((tid) => ({
        responsibility_id: resp.id,
        teacher_id: tid
      }))
    );
    if (aErr) throw new Error(aErr.message);
  }

  const { responsibilities } = await getResponsibilities();
  return responsibilities.find((r) => r.id === resp.id) ?? { ...resp, assigned_teachers: [] };
}

export async function updateResponsibility(
  id: string,
  payload: UpdateResponsibilityPayload
): Promise<void> {
  const db = supabase();
  const updates: Record<string, unknown> = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.task_status !== undefined) updates.task_status = payload.task_status;
  if (payload.progress !== undefined) updates.progress = payload.progress;
  if (payload.due_date !== undefined) updates.due_date = payload.due_date;
  if (payload.remarks !== undefined) updates.remarks = payload.remarks;
  if (payload.attachment_url !== undefined) updates.attachment_url = payload.attachment_url;
  if (payload.status !== undefined) updates.status = payload.status;

  const { error } = await db.from('responsibilities').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteResponsibility(id: string): Promise<void> {
  const { error } = await supabase().from('responsibilities').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function assignTeacher(responsibilityId: string, teacherId: string): Promise<void> {
  const { error } = await supabase()
    .from('responsibility_assignments')
    .upsert({ responsibility_id: responsibilityId, teacher_id: teacherId });
  if (error) throw new Error(error.message);
}

export async function unassignTeacher(responsibilityId: string, teacherId: string): Promise<void> {
  const { error } = await supabase()
    .from('responsibility_assignments')
    .delete()
    .eq('responsibility_id', responsibilityId)
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
}

/**
 * HOD uploads a reference/instruction document for a responsibility.
 * responsibilityId can be undefined for new (not-yet-created) responsibilities.
 */
export async function uploadHodAttachment(
  file: File,
  responsibilityId: string | undefined,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    if (responsibilityId) form.append('responsibility_id', responsibilityId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/responsibilities/upload');
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.url as string);
        } else {
          reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid response from upload server'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

// ─── Teacher-side ─────────────────────────────────────────────────────────

export async function getMyResponsibilities(): Promise<MyResponsibility[]> {
  const res = await fetch('/api/my-responsibilities', { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load responsibilities (${res.status})`);
  }
  const body = (await res.json()) as { responsibilities: MyResponsibility[] };
  return body.responsibilities;
}

/**
 * HOD: fetch full update history for a single responsibility.
 * Calls GET /api/responsibilities/[id]/updates.
 */
export async function getResponsibilityUpdates(
  id: string
): Promise<import('./types').ResponsibilityUpdatesResponse> {
  const res = await fetch(`/api/responsibilities/${id}/updates`, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load updates (${res.status})`);
  }
  return res.json() as Promise<import('./types').ResponsibilityUpdatesResponse>;
}

/**
 * HOD: fetch latest updates across ALL responsibilities (for the Updates tab).
 * Returns one latest update per responsibility that has been updated by teachers.
 */
export async function getAllResponsibilityUpdates(): Promise<
  import('./types').ResponsibilityUpdate[]
> {
  const res = await fetch('/api/responsibilities/updates/all', { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load updates (${res.status})`);
  }
  const body = (await res.json()) as { updates: import('./types').ResponsibilityUpdate[] };
  return body.updates;
}

export interface UpdateMyResponsibilityPayload {
  task_status?: import('./types').TaskStatus;
  progress?: number;
  remarks?: string;
  attachment_url?: string | null;
}

/**
 * Teacher updates their own responsibility progress / status / remarks / attachment.
 * Calls PATCH /api/my-responsibilities/[id] — server validates assignment ownership.
 */
export async function updateMyResponsibility(
  id: string,
  payload: UpdateMyResponsibilityPayload
): Promise<void> {
  const res = await fetch(`/api/my-responsibilities/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Update failed (${res.status})`);
  }
}

/**
 * Upload a document to Supabase Storage and return the public URL.
 * Calls POST /api/my-responsibilities/upload.
 */
export async function uploadAttachment(
  responsibilityId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('responsibility_id', responsibilityId);

  // Use XMLHttpRequest so we can track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/my-responsibilities/upload');
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.url as string);
        } else {
          reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid response from upload server'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}
