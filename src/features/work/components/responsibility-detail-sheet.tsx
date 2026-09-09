'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { responsibilityUpdatesQueryOptions } from '@/features/work/api/queries';
import { TASK_STATUS_LABELS, type ResponsibilityUpdate } from '@/features/work/api/types';
import { useQuery } from '@tanstack/react-query';

// ─── helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  verified: 'bg-primary/10 text-primary'
};

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(iso));
}

// ─── single update entry ──────────────────────────────────────────────────

function UpdateEntry({ entry, isLatest }: { entry: ResponsibilityUpdate; isLatest: boolean }) {
  const initials = (entry.teacher_name ?? entry.teacher_email ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className='flex gap-3'>
      {/* Timeline line */}
      <div className='flex flex-col items-center'>
        <Avatar size='sm'>
          <AvatarImage src={entry.teacher_avatar ?? ''} alt={entry.teacher_name ?? ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className='mt-1 w-px flex-1 bg-border' />
      </div>

      {/* Content */}
      <div className='mb-6 min-w-0 flex-1 space-y-2'>
        {/* Header */}
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm font-semibold'>
            {entry.teacher_name ?? entry.teacher_email ?? 'Teacher'}
          </span>
          {isLatest && (
            <Badge variant='default' className='text-xs'>
              Latest
            </Badge>
          )}
          <span className='text-muted-foreground text-xs'>{fmtDateTime(entry.created_at)}</span>
        </div>

        {/* Status + progress */}
        <div className='flex flex-wrap items-center gap-2'>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOUR[entry.task_status] ?? 'bg-muted'}`}
          >
            {TASK_STATUS_LABELS[entry.task_status]}
          </span>
          <span className='text-muted-foreground text-xs'>{entry.progress}% complete</span>
        </div>

        {/* Progress bar */}
        <Progress value={entry.progress} className='h-1.5 w-full max-w-xs' />

        {/* Remarks */}
        {entry.remarks && (
          <div className='rounded-md bg-muted px-3 py-2 text-sm'>
            <p className='text-muted-foreground mb-0.5 text-xs font-medium'>Remarks</p>
            <p className='leading-relaxed'>{entry.remarks}</p>
          </div>
        )}

        {/* Attachment */}
        {entry.attachment_url && (
          <a
            href={entry.attachment_url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 text-xs text-primary hover:underline'
          >
            <Icons.paperclip className='h-3.5 w-3.5' />
            View attached document
          </a>
        )}
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className='space-y-6 px-6 py-4'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='flex gap-3'>
          <Skeleton className='h-8 w-8 rounded-full shrink-0' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-3 w-1/4' />
            <Skeleton className='h-2 w-40' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main sheet ───────────────────────────────────────────────────────────

interface ResponsibilityDetailSheetProps {
  responsibilityId: string | null;
  responsibilityTitle?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ResponsibilityDetailSheet({
  responsibilityId,
  responsibilityTitle,
  open,
  onOpenChange
}: ResponsibilityDetailSheetProps) {
  const { data, isLoading, error } = useQuery({
    ...responsibilityUpdatesQueryOptions(responsibilityId ?? ''),
    enabled: open && !!responsibilityId
  });

  const updates = data?.updates ?? [];
  const title = data?.title ?? responsibilityTitle ?? 'Responsibility';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg'>
        {/* Header */}
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='flex items-center gap-2'>
            <Icons.clipboardCheck className='text-primary h-4 w-4 shrink-0' />
            <span className='line-clamp-1'>{title}</span>
          </SheetTitle>
          <SheetDescription>Teacher update history — newest first</SheetDescription>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className='min-h-0 flex-1'>
          {isLoading ? (
            <TimelineSkeleton />
          ) : error ? (
            <div className='px-6 py-4'>
              <Alert>
                <Icons.warning className='h-4 w-4' />
                <AlertDescription>
                  <p className='font-semibold'>Could not load updates</p>
                  <p className='text-muted-foreground mt-1 text-xs font-mono'>
                    {(error as Error).message}
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          ) : updates.length === 0 ? (
            <div className='flex flex-col items-center gap-3 px-6 py-16 text-center'>
              <div className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'>
                <Icons.clock className='text-muted-foreground h-6 w-6' />
              </div>
              <div>
                <p className='font-semibold'>No updates yet</p>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Teachers haven&apos;t submitted any progress updates for this responsibility.
                </p>
              </div>
            </div>
          ) : (
            <div className='px-6 pt-6 pb-4'>
              {/* Summary stats */}
              <div className='mb-6 grid grid-cols-3 gap-3'>
                <div className='rounded-lg border bg-muted/30 px-3 py-2 text-center'>
                  <p className='text-xl font-bold tabular-nums'>{updates.length}</p>
                  <p className='text-muted-foreground text-xs'>Updates</p>
                </div>
                <div className='rounded-lg border bg-muted/30 px-3 py-2 text-center'>
                  <p className='text-xl font-bold tabular-nums'>{updates[0].progress}%</p>
                  <p className='text-muted-foreground text-xs'>Latest</p>
                </div>
                <div className='rounded-lg border bg-muted/30 px-3 py-2 text-center'>
                  <p className='text-xl font-bold tabular-nums'>
                    {new Set(updates.map((u) => u.teacher_id)).size}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {new Set(updates.map((u) => u.teacher_id)).size === 1 ? 'Teacher' : 'Teachers'}
                  </p>
                </div>
              </div>

              <Separator className='mb-6' />

              {/* Timeline */}
              <div>
                {updates.map((entry, idx) => (
                  <UpdateEntry key={entry.id} entry={entry} isLatest={idx === 0} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
