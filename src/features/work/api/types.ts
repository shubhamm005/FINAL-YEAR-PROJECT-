// ─── Core domain types ────────────────────────────────────────────────────

export type ResponsibilityStatus = 'active' | 'inactive';

export interface TeacherProfile {
  id: string; // auth.users uuid
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AssignedTeacher extends TeacherProfile {
  assigned_at: string;
}

export interface Responsibility {
  id: string;
  title: string;
  description: string | null;
  status: ResponsibilityStatus;
  created_by: string; // HOD uuid
  created_at: string;
  updated_at: string;
  assigned_teachers: AssignedTeacher[];
}

// ─── Query filters ────────────────────────────────────────────────────────

export interface WorkFilters {
  search?: string;
  status?: ResponsibilityStatus | 'all';
}

// ─── API response shapes ──────────────────────────────────────────────────

export interface ResponsibilitiesResponse {
  responsibilities: Responsibility[];
  total: number;
}

// ─── Mutation payloads ────────────────────────────────────────────────────

export interface CreateResponsibilityPayload {
  title: string;
  description?: string;
  teacherIds: string[]; // profiles.id[] to assign immediately
}

export interface UpdateResponsibilityPayload {
  title?: string;
  description?: string;
  status?: ResponsibilityStatus;
}

export interface AssignTeacherPayload {
  responsibilityId: string;
  teacherId: string;
}

// ─── Teacher-side view ────────────────────────────────────────────────────

export interface MyResponsibility {
  id: string;
  title: string;
  description: string | null;
  status: ResponsibilityStatus;
  created_at: string;
  assigned_at: string;
}
