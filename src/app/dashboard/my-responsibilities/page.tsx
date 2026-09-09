import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyResponsibilitiesClient from './page-client';

export const metadata = {
  title: 'My Responsibilities',
  description: 'View responsibilities assigned to you by the Head of Department.'
};

/**
 * Server component — only teachers can access this page.
 * HODs are redirected to their own Work & Responsibility page.
 */
export default async function MyResponsibilitiesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/sign-in');

  const role = user.user_metadata?.role;
  if (role === 'hod') redirect('/dashboard/work');
  if (role !== 'teacher') redirect('/dashboard/overview');

  return <MyResponsibilitiesClient />;
}
