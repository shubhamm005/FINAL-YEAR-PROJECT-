'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { workKeys, responsibilitiesQueryOptions } from '@/features/work/api/queries';
import { deleteResponsibility, updateResponsibility } from '@/features/work/api/service';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Responsibility
} from '@/features/work/api/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddResponsibilitySheet } from './add-responsibility-sheet';
import { ResponsibilityDetailSheet } from './responsibility-detail-sheet';

// ─── Priority colour helper ───────────────────────────────────────────────

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

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className='rounded-xl border p-4 space-y-3'>
          <Skeleton className='h-5 w-3/4' />
          <Skeleton className='h-4 w-1/4' />
          <Skeleton className='h-12 w-full' />
          <div className='flex gap-1 pt-2'>
            <Skeleton className='h-6 w-6 rounded-full' />
            <Skeleton className='h-6 w-6 rounded-full' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  const msg = message.toLowerCase();
  const isTableMissing =
    msg.includes('42p01') || (msg.includes('relation') && msg.includes('does not exist'));

  if (isTableMissing) {
    return (
      <Alert>
        <Icons.info className='h-4 w-4' />
        <AlertDescription className='space-y-1'>
          <p className='font-semibold'>Database setup required</p>
          <p className='text-muted-foreground text-sm'>
            Run the Work & Responsibility SQL migration in Supabase SQL Editor, then refresh.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Icons.warning className='h-4 w-4' />
      <AlertDescription>
        <p className='font-semibold'>Something went wrong</p>
        <p className='text-muted-foreground mt-1 text-sm font-mono'>{message}</p>
      </AlertDescription>
    </Alert>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className='flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center'>
      <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
        <Icons.briefcase className='text-muted-foreground h-7 w-7' />
      </div>
      <div>
        <p className='font-semibold'>No responsibilities yet</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          Add a responsibility and assign teachers to it.
        </p>
      </div>
      <Button onClick={onAdd} size='sm'>
        <Icons.add className='mr-2 h-4 w-4' />
        Add Responsibility
      </Button>
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────

function ResponsibilityCard({
  item,
  onEdit,
  onViewUpdates
}: {
  item: Responsibility;
  onEdit: (item: Responsibility) => void;
  onViewUpdates: (item: Responsibility) => void;
}) {
  const qc = useQueryClient();

  const toggleStatus = useMutation({
    mutationFn: () =>
      updateResponsibility(item.id, {
        status: item.status === 'active' ? 'inactive' : 'active'
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workKeys.all });
      toast.success(`Marked as ${item.status === 'active' ? 'inactive' : 'active'}`);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const remove = useMutation({
    mutationFn: () => deleteResponsibility(item.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workKeys.all });
      toast.success('Responsibility deleted');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const MAX_VISIBLE = 3;
  const visible = item.assigned_teachers.slice(0, MAX_VISIBLE);
  const extraCount = item.assigned_teachers.length - MAX_VISIBLE;

  const dueDate = item.due_date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(item.due_date)
      )
    : null;

  const isOverdue =
    item.due_date &&
    item.task_status !== 'completed' &&
    item.task_status !== 'verified' &&
    new Date(item.due_date) < new Date();

  return (
    <Card className='group relative flex flex-col gap-0 transition-shadow hover:shadow-md'>
      <CardHeader className='pb-2'>
        {/* Title row */}
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-start gap-2 min-w-0'>
            <Icons.clipboardCheck className='text-primary mt-0.5 h-4 w-4 shrink-0' />
            <CardTitle className='text-sm leading-snug'>{item.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                  aria-label='Actions'
                />
              }
            >
              <Icons.ellipsis className='h-4 w-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Icons.edit className='mr-2 h-4 w-4' /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleStatus.mutate()}>
                {item.status === 'active' ? (
                  <>
                    <Icons.eyeOff className='mr-2 h-4 w-4' />
                    Mark inactive
                  </>
                ) : (
                  <>
                    <Icons.circleCheck className='mr-2 h-4 w-4' />
                    Mark active
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => remove.mutate()}
              >
                <Icons.trash className='mr-2 h-4 w-4' /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges row */}
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
        {item.description && (
          <CardDescription className='line-clamp-2 text-xs leading-relaxed'>
            {item.description}
          </CardDescription>
        )}

        {/* Progress bar */}
        <div className='space-y-1'>
          <div className='flex justify-between text-xs text-muted-foreground'>
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <Progress value={item.progress} className='h-1.5' />
        </div>

        {/* Due date */}
        {dueDate && (
          <div
            className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            <Icons.calendar className='h-3.5 w-3.5 shrink-0' />
            <span>
              {isOverdue ? 'Overdue · ' : 'Due '}
              {dueDate}
            </span>
          </div>
        )}

        {/* Assigned teachers */}
        <div className='mt-auto flex items-center gap-2 border-t pt-2'>
          {item.assigned_teachers.length === 0 ? (
            <p className='text-muted-foreground text-xs italic'>No teachers assigned</p>
          ) : (
            <>
              <AvatarGroup>
                {visible.map((t) => (
                  <Avatar key={t.id} size='sm' title={t.full_name ?? t.email ?? ''}>
                    <AvatarImage src={t.avatar_url ?? ''} alt={t.full_name ?? ''} />
                    <AvatarFallback>
                      {(t.full_name ?? t.email ?? '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extraCount > 0 && <AvatarGroupCount>+{extraCount}</AvatarGroupCount>}
              </AvatarGroup>
              <span className='text-muted-foreground text-xs'>
                {item.assigned_teachers.length === 1
                  ? '1 teacher'
                  : `${item.assigned_teachers.length} teachers`}
              </span>
            </>
          )}
        </div>

        {/* View updates button */}
        <Button
          size='sm'
          variant='outline'
          className='w-full gap-2'
          onClick={() => onViewUpdates(item)}
        >
          <Icons.clipboardCheck className='h-3.5 w-3.5' />
          View Updates
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────

interface ResponsibilityListProps {
  search?: string;
  status?: string;
  sheetOpen: boolean;
  onSheetOpenChange: (v: boolean) => void;
}

export function ResponsibilityList({
  search,
  status,
  sheetOpen,
  onSheetOpenChange
}: ResponsibilityListProps) {
  const [editItem, setEditItem] = useState<Responsibility | null>(null);
  const [detailItem, setDetailItem] = useState<Responsibility | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, error } = useQuery(
    responsibilitiesQueryOptions({ search, status: status as any })
  );

  function handleEdit(item: Responsibility) {
    setEditItem(item);
    onSheetOpenChange(true);
  }

  function handleSheetChange(open: boolean) {
    onSheetOpenChange(open);
    if (!open) setEditItem(null);
  }

  function handleViewUpdates(item: Responsibility) {
    setDetailItem(item);
    setDetailOpen(true);
  }

  let content: React.ReactNode;
  if (isLoading) {
    content = <ListSkeleton />;
  } else if (error) {
    content = <ErrorState message={(error as Error).message} />;
  } else if (!data || data.responsibilities.length === 0) {
    content = <EmptyState onAdd={() => onSheetOpenChange(true)} />;
  } else {
    content = (
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {data.responsibilities.map((item) => (
          <ResponsibilityCard
            key={item.id}
            item={item}
            onEdit={handleEdit}
            onViewUpdates={handleViewUpdates}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {content}
      <AddResponsibilitySheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        editItem={editItem}
      />
      <ResponsibilityDetailSheet
        responsibilityId={detailItem?.id ?? null}
        responsibilityTitle={detailItem?.title}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailItem(null);
        }}
      />
    </>
  );
}
