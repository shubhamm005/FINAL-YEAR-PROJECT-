import { queryOptions } from '@tanstack/react-query';
import {
  getResponsibilities,
  getTeachers,
  getMyResponsibilities,
  getResponsibilityUpdates,
  getAllResponsibilityUpdates
} from './service';
import type { WorkFilters } from './types';

// ─── Query key factory ────────────────────────────────────────────────────

export const workKeys = {
  all: ['work'] as const,
  responsibilities: (filters: WorkFilters) =>
    [...workKeys.all, 'responsibilities', filters] as const,
  teachers: () => [...workKeys.all, 'teachers'] as const,
  myResponsibilities: () => [...workKeys.all, 'my-responsibilities'] as const,
  myResponsibility: (id: string) => [...workKeys.all, 'my-responsibilities', id] as const,
  responsibilityUpdates: (id: string) => [...workKeys.all, 'updates', id] as const,
  allUpdates: () => [...workKeys.all, 'all-updates'] as const
};

// ─── Query options ────────────────────────────────────────────────────────

export const responsibilitiesQueryOptions = (filters: WorkFilters = {}) =>
  queryOptions({
    queryKey: workKeys.responsibilities(filters),
    queryFn: () => getResponsibilities(filters),
    staleTime: 30_000
  });

export const teachersQueryOptions = () =>
  queryOptions({
    queryKey: workKeys.teachers(),
    queryFn: () => getTeachers(),
    staleTime: 60_000
  });

export const myResponsibilitiesQueryOptions = () =>
  queryOptions({
    queryKey: workKeys.myResponsibilities(),
    queryFn: () => getMyResponsibilities(),
    staleTime: 30_000
  });

export const responsibilityUpdatesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: workKeys.responsibilityUpdates(id),
    queryFn: () => getResponsibilityUpdates(id),
    staleTime: 15_000,
    enabled: !!id
  });

export const allUpdatesQueryOptions = () =>
  queryOptions({
    queryKey: workKeys.allUpdates(),
    queryFn: () => getAllResponsibilityUpdates(),
    staleTime: 15_000
  });
