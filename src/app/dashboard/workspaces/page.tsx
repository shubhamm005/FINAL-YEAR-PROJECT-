import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role as string | undefined;
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? '—';

  return (
    <PageContainer pageTitle='Workspace' pageDescription='Your department workspace overview'>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {fullName}</CardTitle>
          <CardDescription>
            {role === 'hod'
              ? 'You have full department access as Head of Department.'
              : 'You are signed in as a Teacher.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Use the sidebar to navigate to your dashboard sections.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
