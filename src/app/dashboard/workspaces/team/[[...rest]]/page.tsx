import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Only HODs can access the team management page
  if (user?.user_metadata?.role !== 'hod') {
    redirect('/dashboard/overview');
  }

  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your department team and members.'
    >
      <Card>
        <CardHeader>
          <CardTitle>Department Team</CardTitle>
          <CardDescription>
            Team management features will be available here once connected to your Supabase
            database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Add your team queries and management UI here. Connect a <code>profiles</code> table in
            Supabase to list and manage teachers.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
