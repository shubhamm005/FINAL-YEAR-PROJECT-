'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { myResponsibilitiesQueryOptions } from '@/features/work/api/queries';
import type { MyResponsibility } from '@/features/work/api/types';
import { useQuery } from '@tanstack/react-query';

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='rounded-xl border p-5 space-y-3'>
          <Skeleton className='h-5 w-2/3' />
          <Skeleton className='h-4 w-1/4' />
          <Skeleton className='h-14 w-full' />
          <Skeleton className='h-3 w-1/3' />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className='flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center'>
      <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
        <Icons.clipboardCheck className='text-muted-foreground h-7 w-7' />
      </div>
      <div>
        <p className='font-semibold'>No responsibilities assigned yet</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          Your Head of Department will assign responsibilities to you here.
        </p>
      </div>
    </div>
  );
}

// ─── Single responsibility card ───────────────────────────────────────────

function ResponsibilityDetailCard({ item }: { item: MyResponsibility }) {
  const assignedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(item.assigned_at));

  return (
    <Card className='flex flex-col gap-0 transition-shadow hover:shadow-md'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-start gap-2'>
            <Icons.clipboardCheck className='text-primary mt-0.5 h-4 w-4 shrink-0' />
            <CardTitle className='text-base leading-snug'>{item.title}</CardTitle>
          </div>
          <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className='shrink-0'>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='flex flex-1 flex-col gap-4 pt-0'>
        {/* Description */}
        {item.description ? (
          <CardDescription className='text-sm leading-relaxed'>{item.description}</CardDescription>
        ) : (
          <p className='text-muted-foreground text-sm italic'>No description provided.</p>
        )}

        {/* Assigned date */}
        <div className='mt-auto flex items-center gap-1.5 pt-2 border-t'>
          <Icons.calendar className='text-muted-foreground h-3.5 w-3.5' />
          <span className='text-muted-foreground text-xs'>Assigned on {assignedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────

export function MyResponsibilitiesList() {
  const { data, isLoading, error } = useQuery(myResponsibilitiesQueryOptions());

  if (isLoading) return <ListSkeleton />;

  if (error) {
    return (
      <Alert>
        <Icons.warning className='h-4 w-4' />
        <AlertDescription>
          <p className='font-semibold'>Could not load responsibilities</p>
          <p className='text-muted-foreground mt-1 text-sm font-mono'>{(error as Error).message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) return <EmptyState />;

  const active = data.filter((r) => r.status === 'active');
  const inactive = data.filter((r) => r.status === 'inactive');

  return (
    <div className='space-y-8'>
      {/* Active */}
      {active.length > 0 && (
        <section className='space-y-3'>
          <div className='flex items-center gap-2'>
            <h3 className='text-sm font-semibold'>Active</h3>
            <Badge variant='default' className='text-xs'>
              {active.length}
            </Badge>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {active.map((item) => (
              <ResponsibilityDetailCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <section className='space-y-3'>
          <div className='flex items-center gap-2'>
            <h3 className='text-sm font-semibold text-muted-foreground'>Inactive</h3>
            <Badge variant='secondary' className='text-xs'>
              {inactive.length}
            </Badge>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {inactive.map((item) => (
              <ResponsibilityDetailCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
