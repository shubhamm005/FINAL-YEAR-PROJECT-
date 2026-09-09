import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WorkPageClient from './page-client';

export const metadata = {
  title: 'Work & Responsibility',
  description: 'Manage department responsibilities and assign teachers.'
};

/**
 * Server component — verifies the user is an HOD before rendering.
 * Hands off to the client component for interactive tabs + sheet.
 */
export default async function WorkPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/sign-in');
  if (user.user_metadata?.role !== 'hod') redirect('/dashboard/overview');

  return <WorkPageClient />;
}
