import { queryOptions } from '@tanstack/react-query';
import { getResponsibilities, getTeachers, getMyResponsibilities } from './service';
import type { WorkFilters } from './types';

// ─── Query key factory ────────────────────────────────────────────────────

export const workKeys = {
  all: ['work'] as const,
  responsibilities: (filters: WorkFilters) =>
    [...workKeys.all, 'responsibilities', filters] as const,
  teachers: () => [...workKeys.all, 'teachers'] as const,
  myResponsibilities: () => [...workKeys.all, 'my-responsibilities'] as const
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
