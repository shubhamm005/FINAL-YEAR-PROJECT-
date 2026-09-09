'use client';

/**
 * Client-side RBAC navigation filtering using Supabase session.
 *
 * Reads the current user's role from user_metadata.role (set at sign-up).
 * Filters sidebar items so HODs and Teachers only see what's relevant to them.
 *
 * Security note: this is UI-only filtering. Actual page-level protection lives
 * in the dashboard layout server component and individual page guards.
 */

import { useSupabaseUser } from '@/hooks/use-supabase-user';
import type { NavGroup, NavItem } from '@/types';
import { useMemo } from 'react';

function checkAccess(item: NavItem, role: string | null): boolean {
  if (!item.access) return true;
  if (item.access.role && item.access.role !== role) return false;
  return true;
}

/**
 * Filter a flat list of nav items based on the current user's role.
 */
export function useFilteredNavItems(items: NavItem[]): NavItem[] {
  const { role } = useSupabaseUser();

  return useMemo(
    () =>
      items
        .filter((item) => checkAccess(item, role))
        .map((item) => {
          if (!item.items?.length) return item;
          return {
            ...item,
            items: item.items.filter((child) => checkAccess(child, role))
          };
        }),
    [items, role]
  );
}

/**
 * Filter nav groups, removing items the current user cannot access.
 * Groups with no visible items are omitted entirely.
 */
export function useFilteredNavGroups(groups: NavGroup[]): NavGroup[] {
  const { role } = useSupabaseUser();

  return useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => checkAccess(item, role))
            .map((item) => {
              if (!item.items?.length) return item;
              return {
                ...item,
                items: item.items.filter((child) => checkAccess(child, role))
              };
            })
        }))
        .filter((group) => group.items.length > 0),
    [groups, role]
  );
}
