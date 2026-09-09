'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { allUpdatesQueryOptions } from '@/features/work/api/queries';
import { TASK_STATUS_LABELS } from '@/features/work/api/types';
import { ResponsibilityDetailSheet } from './responsibility-detail-sheet';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

// ─── helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  pending: 'text-muted-foreground',
  in_progress: 'text-blue-600 dark:text-blue-400',
  completed: 'text-green-600 dark:text-green-400',
  verified: 'text-primary'
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(iso));
}

// ─── skeleton ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className='space-y-3'>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className='rounded-xl border p-4 flex gap-3'>
          <Skeleton className='h-8 w-8 rounded-full shrink-0' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-3 w-3/4' />
            <Skeleton className='h-2 w-32' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── empty ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className='flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center'>
      <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
        <Icons.clock className='text-muted-foreground h-7 w-7' />
      </div>
      <div>
        <p className='font-semibold'>No updates yet</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          Updates will appear here once teachers start submitting progress.
        </p>
      </div>
    </div>
  );
}

// ─── main list ────────────────────────────────────────────────────────────

export function UpdatesList() {
  const { data, isLoading, error } = useQuery(allUpdatesQueryOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(id: string, title?: string) {
    setSelectedId(id);
    setSelectedTitle(title);
    setDetailOpen(true);
  }

  if (isLoading) return <ListSkeleton />;

  if (error) {
    return (
      <Alert>
        <Icons.warning className='h-4 w-4' />
        <AlertDescription>
          <p className='font-semibold'>Could not load updates</p>
          <p className='text-muted-foreground mt-1 text-sm font-mono'>{(error as Error).message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) return <EmptyState />;

  // Group by responsibility
  type UpdateWithTitle = (typeof data)[0] & { responsibility_title?: string };
  const grouped = data.reduce<Record<string, UpdateWithTitle[]>>((acc, u) => {
    const key = u.responsibility_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(u as UpdateWithTitle);
    return acc;
  }, {});

  return (
    <>
      <div className='space-y-3'>
        {Object.entries(grouped).map(([respId, entries]) => {
          const latest = entries[0]; // already sorted newest first
          const title = (latest as any).responsibility_title ?? 'Responsibility';
          const uniqueTeachers = new Set(entries.map((e) => e.teacher_id)).size;

          return (
            <button
              key={respId}
              type='button'
              onClick={() => openDetail(respId, title)}
              className='w-full rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <div className='flex items-start gap-3'>
                {/* Teacher avatars */}
                <div className='flex -space-x-2 shrink-0'>
                  {entries.slice(0, 3).map((e) => {
                    const initials = (e.teacher_name ?? e.teacher_email ?? '?')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <Avatar key={e.id} size='sm' className='ring-2 ring-background'>
                        <AvatarImage src={e.teacher_avatar ?? ''} alt={e.teacher_name ?? ''} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {entries.length > 3 && (
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background'>
                      +{entries.length - 3}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='truncate text-sm font-semibold'>{title}</p>
                    <span className='text-muted-foreground shrink-0 text-xs'>
                      {fmtRelative(latest.created_at)}
                    </span>
                  </div>

                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    {uniqueTeachers === 1
                      ? `${latest.teacher_name ?? latest.teacher_email} · `
                      : `${uniqueTeachers} teachers · `}
                    {entries.length} {entries.length === 1 ? 'update' : 'updates'}
                  </p>

                  {/* Latest status + progress */}
                  <div className='mt-2 flex items-center gap-3'>
                    <span
                      className={`text-xs font-medium ${STATUS_COLOUR[latest.task_status] ?? ''}`}
                    >
                      {TASK_STATUS_LABELS[latest.task_status]}
                    </span>
                    <div className='flex flex-1 items-center gap-2'>
                      <Progress value={latest.progress} className='h-1.5 flex-1' />
                      <span className='text-muted-foreground shrink-0 tabular-nums text-xs'>
                        {latest.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Latest remark preview */}
                  {latest.remarks && (
                    <p className='text-muted-foreground mt-1.5 line-clamp-1 text-xs'>
                      &ldquo;{latest.remarks}&rdquo;
                    </p>
                  )}

                  {/* Attachment indicator */}
                  {latest.attachment_url && (
                    <span className='mt-1 inline-flex items-center gap-1 text-xs text-primary'>
                      <Icons.paperclip className='h-3 w-3' />
                      Document attached
                    </span>
                  )}
                </div>

                <Icons.chevronRight className='text-muted-foreground mt-1 h-4 w-4 shrink-0' />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail sheet */}
      <ResponsibilityDetailSheet
        responsibilityId={selectedId}
        responsibilityTitle={selectedTitle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
