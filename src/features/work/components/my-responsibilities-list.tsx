'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { myResponsibilitiesQueryOptions } from '@/features/work/api/queries';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type MyResponsibility
} from '@/features/work/api/types';
import { UpdateProgressSheet } from './update-progress-sheet';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  verified: 'default'
};

function fmt(dateStr: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='rounded-xl border p-5 space-y-3'>
          <Skeleton className='h-5 w-2/3' />
          <div className='flex gap-1'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-4 w-16' />
          </div>
          <Skeleton className='h-14 w-full' />
          <Skeleton className='h-2 w-full rounded-full' />
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

// ─── Single card ──────────────────────────────────────────────────────────

function ResponsibilityDetailCard({ item }: { item: MyResponsibility }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const isOverdue =
    item.due_date &&
    item.task_status !== 'completed' &&
    item.task_status !== 'verified' &&
    new Date(item.due_date) < new Date();

  return (
    <>
      <Card className='flex flex-col gap-0 transition-shadow hover:shadow-md'>
        <CardHeader className='pb-2'>
          <div className='flex items-start gap-2'>
            <Icons.clipboardCheck className='text-primary mt-0.5 h-4 w-4 shrink-0' />
            <CardTitle className='text-sm leading-snug'>{item.title}</CardTitle>
          </div>

          {/* Badges */}
          <div className='flex flex-wrap gap-1.5 pt-1'>
            <Badge variant={PRIORITY_VARIANT[item.priority] ?? 'outline'} className='text-xs'>
              {PRIORITY_LABELS[item.priority]}
            </Badge>
            <Badge variant='outline' className='text-xs'>
              {CATEGORY_LABELS[item.category]}
            </Badge>
            <Badge variant={STATUS_VARIANT[item.task_status] ?? 'outline'} className='text-xs'>
              {TASK_STATUS_LABELS[item.task_status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className='flex flex-1 flex-col gap-3 pt-0'>
          {/* Description */}
          {item.description ? (
            <CardDescription className='text-xs leading-relaxed line-clamp-3'>
              {item.description}
            </CardDescription>
          ) : (
            <p className='text-muted-foreground text-xs italic'>No description provided.</p>
          )}

          {/* Progress */}
          <div className='space-y-1'>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>Progress</span>
              <span className='font-medium tabular-nums'>{item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-2' />
          </div>

          {/* Remarks */}
          {item.remarks && (
            <div className='rounded-md bg-muted px-3 py-2'>
              <p className='text-xs font-medium text-muted-foreground mb-0.5'>Remarks</p>
              <p className='text-xs leading-relaxed line-clamp-2'>{item.remarks}</p>
            </div>
          )}

          {/* Attachment */}
          {item.attachment_url && (
            <a
              href={item.attachment_url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1.5 text-xs text-primary hover:underline'
            >
              <Icons.paperclip className='h-3.5 w-3.5 shrink-0' />
              View attachment
            </a>
          )}

          {/* Dates */}
          <div className='space-y-1 border-t pt-2'>
            {item.due_date && (
              <div
                className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                <Icons.calendar className='h-3.5 w-3.5 shrink-0' />
                <span>
                  {isOverdue ? 'Overdue · ' : 'Due '}
                  {fmt(item.due_date)}
                </span>
              </div>
            )}
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Icons.clock className='h-3.5 w-3.5 shrink-0' />
              <span>Assigned {fmt(item.assigned_at)}</span>
            </div>
          </div>

          {/* Update button */}
          <Button
            size='sm'
            variant='outline'
            className='mt-1 w-full gap-2'
            onClick={() => setSheetOpen(true)}
            disabled={item.task_status === 'verified'}
          >
            <Icons.edit className='h-3.5 w-3.5' />
            {item.task_status === 'verified' ? 'Verified by HOD' : 'Update Progress'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress update sheet */}
      <UpdateProgressSheet item={item} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
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
