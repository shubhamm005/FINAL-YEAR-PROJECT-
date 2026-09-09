'use client';

import { useMounted } from '@/hooks/use-mounted';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';

const ROLE_LABELS: Record<string, string> = {
  hod: 'Head of Department',
  teacher: 'Teacher'
};

const ROLE_ICONS: Record<string, keyof typeof Icons> = {
  hod: 'badgeCheck',
  teacher: 'user'
};

/**
 * Shows the current user's role and name in the sidebar header.
 *
 * Renders a stable skeleton on the server and on the initial client
 * render to avoid SSR hydration mismatches. After mount, swaps in the
 * real user data fetched by useSupabaseUser.
 */
export function RoleBadge() {
  const { state } = useSidebar();
  const mounted = useMounted();
  const { role, fullName } = useSupabaseUser();

  // These values are used only after mount — SSR always sees the skeleton.
  const label = mounted && role ? (ROLE_LABELS[role] ?? role) : 'Dashboard';
  const iconKey: keyof typeof Icons =
    mounted && role && ROLE_ICONS[role] ? ROLE_ICONS[role] : 'dashboard';
  const Icon = Icons[iconKey];
  const displayName = mounted ? fullName || 'My Account' : 'My Account';

  const textVisible =
    state !== 'collapsed'
      ? 'visible max-w-full opacity-100'
      : 'invisible max-w-0 overflow-hidden opacity-0';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* aria-busy signals loading state to assistive tech without changing HTML structure */}
        <SidebarMenuButton size='lg' className='cursor-default' aria-busy={!mounted}>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
            <Icon className='size-4' />
          </div>
          <div
            className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${textVisible}`}
          >
            <span className='truncate font-medium'>{displayName}</span>
            <span className='text-muted-foreground truncate text-xs'>{label}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
