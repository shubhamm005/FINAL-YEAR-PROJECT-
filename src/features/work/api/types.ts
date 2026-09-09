// ─── Enums ────────────────────────────────────────────────────────────────

export type ResponsibilityStatus = 'active' | 'inactive';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export type Category = 'academic' | 'administrative' | 'event' | 'lab' | 'other';

export type Priority = 'low' | 'medium' | 'high';

// ─── Display maps (used in forms + cards) ────────────────────────────────

export const CATEGORY_LABELS: Record<Category, string> = {
  academic: 'Academic',
  administrative: 'Administrative',
  event: 'Event',
  lab: 'Lab',
  other: 'Other'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified'
};

// ─── Core domain types ────────────────────────────────────────────────────

export interface TeacherProfile {
  id: string;
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
  category: Category;
  priority: Priority;
  task_status: TaskStatus;
  progress: number; // 0–100
  due_date: string | null; // ISO date string
  remarks: string | null;
  attachment_url: string | null;
  status: ResponsibilityStatus; // active / inactive (HOD control)
  created_by: string;
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
  category: Category;
  priority: Priority;
  due_date?: string;
  attachment_url?: string;
  teacherIds: string[];
}

export interface UpdateResponsibilityPayload {
  title?: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  task_status?: TaskStatus;
  progress?: number;
  due_date?: string | null;
  remarks?: string;
  attachment_url?: string | null;
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
  category: Category;
  priority: Priority;
  task_status: TaskStatus;
  progress: number;
  due_date: string | null;
  remarks: string | null;
  attachment_url: string | null;
  status: ResponsibilityStatus;
  created_at: string;
  assigned_at: string;
}

// ─── HOD update history ───────────────────────────────────────────────────

/** One row in responsibility_updates — teacher's snapshot at a point in time */
export interface ResponsibilityUpdate {
  id: string;
  responsibility_id: string;
  teacher_id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  teacher_avatar: string | null;
  task_status: TaskStatus;
  progress: number;
  remarks: string | null;
  attachment_url: string | null;
  created_at: string; // when this update was logged
}

export interface ResponsibilityUpdatesResponse {
  responsibility_id: string;
  title: string;
  updates: ResponsibilityUpdate[];
}
