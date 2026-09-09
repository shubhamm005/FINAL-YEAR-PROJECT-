/**
 * Work & Responsibility service layer.
 *
 * All functions go through Supabase directly (browser client for mutations,
 * server client for server-side reads). Swap this file to connect a different
 * backend — queries.ts and components never change.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Responsibility,
  ResponsibilitiesResponse,
  TeacherProfile,
  WorkFilters,
  CreateResponsibilityPayload,
  UpdateResponsibilityPayload
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function supabase() {
  return createClient();
}

// ─── Read ─────────────────────────────────────────────────────────────────

/**
 * Fetch all responsibilities created by the current HOD, with assigned
 * teachers joined in.
 */
export async function getResponsibilities(
  filters: WorkFilters = {}
): Promise<ResponsibilitiesResponse> {
  const db = supabase();

  // Verify session is active before querying — avoids RLS-denied empty results
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please sign in again.');

  let query = db
    .from('responsibilities')
    .select(
      `
      id,
      title,
      description,
      status,
      created_by,
      created_at,
      updated_at,
      responsibility_assignments (
        assigned_at,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Flatten the join into the AssignedTeacher[] shape
  const responsibilities: Responsibility[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
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

/**
 * Fetch all teacher profiles for the assignment picker.
 * Calls the /api/teachers Route Handler (runs server-side, bypasses
 * client-facing RLS that would block a HOD reading other profiles).
 */
export async function getTeachers(): Promise<TeacherProfile[]> {
  const res = await fetch('/api/teachers', { credentials: 'include' });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load teachers (${res.status})`);
  }

  const body = (await res.json()) as { teachers: TeacherProfile[] };
  return body.teachers;
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function createResponsibility(
  payload: CreateResponsibilityPayload
): Promise<Responsibility> {
  const db = supabase();

  // 1. Get current user id
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Insert responsibility
  const { data: resp, error: respErr } = await db
    .from('responsibilities')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      created_by: user.id,
      status: 'active'
    })
    .select('*')
    .single();

  if (respErr) throw new Error(respErr.message);

  // 3. Insert assignments (if any teachers selected)
  if (payload.teacherIds.length > 0) {
    const assignments = payload.teacherIds.map((tid) => ({
      responsibility_id: resp.id,
      teacher_id: tid
    }));

    const { error: aErr } = await db.from('responsibility_assignments').insert(assignments);

    if (aErr) throw new Error(aErr.message);
  }

  // 4. Return the full record
  const { responsibilities } = await getResponsibilities();
  return (
    responsibilities.find((r) => r.id === resp.id) ?? {
      ...resp,
      assigned_teachers: []
    }
  );
}

export async function updateResponsibility(
  id: string,
  payload: UpdateResponsibilityPayload
): Promise<void> {
  const db = supabase();
  const { error } = await db
    .from('responsibilities')
    .update({
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.status !== undefined && { status: payload.status })
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteResponsibility(id: string): Promise<void> {
  const db = supabase();
  // Assignments are cascade-deleted by the FK constraint
  const { error } = await db.from('responsibilities').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function assignTeacher(responsibilityId: string, teacherId: string): Promise<void> {
  const db = supabase();
  const { error } = await db
    .from('responsibility_assignments')
    .upsert({ responsibility_id: responsibilityId, teacher_id: teacherId });
  if (error) throw new Error(error.message);
}

export async function unassignTeacher(responsibilityId: string, teacherId: string): Promise<void> {
  const db = supabase();
  const { error } = await db
    .from('responsibility_assignments')
    .delete()
    .eq('responsibility_id', responsibilityId)
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
}

// ─── Teacher-side ─────────────────────────────────────────────────────────

/**
 * Fetch all responsibilities assigned to the currently signed-in teacher.
 * Calls the /api/my-responsibilities Route Handler to avoid RLS recursion.
 */
export async function getMyResponsibilities(): Promise<import('./types').MyResponsibility[]> {
  const res = await fetch('/api/my-responsibilities', { credentials: 'include' });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Failed to load responsibilities (${res.status})`);
  }

  const body = (await res.json()) as { responsibilities: import('./types').MyResponsibility[] };
  return body.responsibilities;
}
