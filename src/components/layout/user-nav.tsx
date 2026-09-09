'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useMounted } from '@/hooks/use-mounted';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const mounted = useMounted();
  const { user, fullName, email, avatarUrl } = useSupabaseUser();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/sign-in');
  }

  // Render nothing until mounted — guarantees server HTML === initial client render.
  if (!mounted || !user) return null;

  const profileUser = {
    fullName,
    emailAddresses: [{ emailAddress: email }],
    imageUrl: avatarUrl
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' className='relative h-8 w-8 rounded-full' />}
      >
        <UserAvatarProfile user={profileUser} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>{fullName}</p>
              <p className='text-muted-foreground text-xs leading-none'>{email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
