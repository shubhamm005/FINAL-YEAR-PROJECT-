import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { createClient } from '@/lib/supabase/server';

export default async function ExclusivePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isHod = user?.user_metadata?.role === 'hod';

  if (!isHod) {
    return (
      <PageContainer pageTitle='Exclusive'>
        <Alert>
          <Icons.lock className='h-5 w-5 text-yellow-600' />
          <AlertDescription>
            <div className='mb-1 text-lg font-semibold'>HOD Access Required</div>
            <div className='text-muted-foreground'>
              This page is only available to the Head of Department.
            </div>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer pageTitle='Exclusive' pageDescription='HOD-only content area'>
      <div className='space-y-6'>
        <div className='flex items-center gap-2'>
          <Icons.badgeCheck className='h-7 w-7 text-green-600' />
          <h1 className='text-3xl font-bold tracking-tight'>Exclusive Area</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>HOD Exclusive Content</CardTitle>
            <CardDescription>This area is restricted to the Head of Department.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm'>
              Add your HOD-specific features and content here.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
