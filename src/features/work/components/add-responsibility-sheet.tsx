'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { LoadingButton } from '@/components/ui/loading-button';
import { Icons } from '@/components/icons';
import { workKeys, teachersQueryOptions } from '@/features/work/api/queries';
import {
  createResponsibility,
  updateResponsibility,
  assignTeacher,
  unassignTeacher
} from '@/features/work/api/service';
import type { Responsibility, TeacherProfile } from '@/features/work/api/types';
import { useAppForm } from '@/lib/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

// ─── Schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string()
});

// ─── Teacher picker row ────────────────────────────────────────────────────

function TeacherRow({
  teacher,
  selected,
  onToggle
}: {
  teacher: TeacherProfile;
  selected: boolean;
  onToggle: () => void;
}) {
  const initials = (teacher.full_name ?? teacher.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <button
      type='button'
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
        ${
          selected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-muted/40'
        }`}
      aria-pressed={selected}
    >
      <Avatar size='sm'>
        <AvatarImage src={teacher.avatar_url ?? ''} alt={teacher.full_name ?? ''} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{teacher.full_name ?? '—'}</p>
        <p className='text-muted-foreground truncate text-xs'>{teacher.email}</p>
      </div>
      {selected && <Icons.check className='text-primary h-4 w-4 shrink-0' />}
    </button>
  );
}

// ─── Main sheet ────────────────────────────────────────────────────────────

interface AddResponsibilitySheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When provided the sheet is in edit mode */
  editItem?: Responsibility | null;
  /** Trigger element — omit if controlling open state externally */
  trigger?: React.ReactNode;
}

export function AddResponsibilitySheet({
  open: controlledOpen,
  onOpenChange,
  editItem,
  trigger
}: AddResponsibilitySheetProps) {
  const qc = useQueryClient();
  const isEditing = !!editItem;

  // Internal open state (used when trigger is provided)
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  // Teacher search
  const [teacherSearch, setTeacherSearch] = useState('');

  // Selected teacher IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialise from editItem
  useEffect(() => {
    if (editItem) {
      setSelectedIds(new Set(editItem.assigned_teachers.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [editItem]);

  // Fetch teachers
  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    ...teachersQueryOptions(),
    enabled: isOpen
  });

  const teachers = teachersData ?? [];
  const filtered = teachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    return (
      (t.full_name ?? '').toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q)
    );
  });

  function toggleTeacher(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ─── Mutations ──────────────────────────────────────────────────────────

  const [loading, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      title: editItem?.title ?? '',
      description: editItem?.description ?? ''
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        try {
          if (isEditing && editItem) {
            // Update title/description
            await updateResponsibility(editItem.id, {
              title: value.title,
              description: value.description || undefined
            });

            // Sync assignments: add new, remove removed
            const prev = new Set(editItem.assigned_teachers.map((t) => t.id));
            const toAdd = [...selectedIds].filter((id) => !prev.has(id));
            const toRemove = [...prev].filter((id) => !selectedIds.has(id));

            await Promise.all([
              ...toAdd.map((tid) => assignTeacher(editItem.id, tid)),
              ...toRemove.map((tid) => unassignTeacher(editItem.id, tid))
            ]);

            toast.success('Responsibility updated');
          } else {
            await createResponsibility({
              title: value.title,
              description: value.description || undefined,
              teacherIds: [...selectedIds]
            });
            toast.success('Responsibility created');
          }

          void qc.invalidateQueries({ queryKey: workKeys.all });
          setOpen(false);
          form.reset();
          setSelectedIds(new Set());
          setTeacherSearch('');
        } catch (e) {
          toast.error((e as Error).message);
        }
      });
    }
  });

  // Reset form when editItem changes
  useEffect(() => {
    form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger render={<span />}>{trigger}</SheetTrigger>}

      <SheetContent side='right' className='flex w-full flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Responsibility' : 'Add Responsibility'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the responsibility details and teacher assignments.'
              : 'Create a new responsibility and assign teachers to it.'}
          </SheetDescription>
        </SheetHeader>

        <form
          className='flex flex-1 flex-col overflow-hidden'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <ScrollArea className='flex-1 px-4'>
            <div className='space-y-5 py-4'>
              {/* Title & Description */}
              <FieldGroup>
                <form.AppField
                  name='title'
                  children={(field) => (
                    <field.TextField
                      label='Title'
                      placeholder='e.g. Class Incharge – 10B'
                      disabled={loading}
                    />
                  )}
                />
                <form.AppField
                  name='description'
                  children={(field) => (
                    <field.TextareaField
                      label='Description'
                      placeholder='Briefly describe this responsibility…'
                      disabled={loading}
                    />
                  )}
                />
              </FieldGroup>

              {/* Teacher picker */}
              <div className='space-y-3'>
                <div>
                  <Label className='text-sm font-medium'>Assign Teachers</Label>
                  <p className='text-muted-foreground text-xs'>
                    Select one or more teachers to assign this responsibility.
                  </p>
                </div>

                {/* Search */}
                <div className='relative'>
                  <Icons.search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                  <Input
                    placeholder='Search teachers…'
                    className='pl-9'
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                  />
                </div>

                {/* Selected count */}
                {selectedIds.size > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {teachers
                      .filter((t) => selectedIds.has(t.id))
                      .map((t) => (
                        <Badge
                          key={t.id}
                          variant='secondary'
                          className='cursor-pointer gap-1 pr-1'
                          onClick={() => toggleTeacher(t.id)}
                        >
                          {t.full_name ?? t.email}
                          <Icons.close className='h-3 w-3' />
                        </Badge>
                      ))}
                  </div>
                )}

                {/* Teacher list */}
                {teachersLoading ? (
                  <div className='space-y-2'>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className='bg-muted h-14 animate-pulse rounded-lg' />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center'>
                    <Icons.userCheck className='text-muted-foreground h-8 w-8' />
                    <p className='text-muted-foreground text-sm font-medium'>
                      {teacherSearch ? 'No teachers match your search' : 'No teachers yet'}
                    </p>
                    {!teacherSearch && (
                      <p className='text-muted-foreground max-w-[220px] text-xs'>
                        Teachers will appear here once they sign up with the{' '}
                        <strong>Teacher</strong> role.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {filtered.map((t) => (
                      <TeacherRow
                        key={t.id}
                        teacher={t}
                        selected={selectedIds.has(t.id)}
                        onToggle={() => toggleTeacher(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className='border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={loading}
              className='flex-1'
            >
              Cancel
            </Button>
            <LoadingButton loading={loading} type='submit' className='flex-1'>
              {isEditing ? 'Save changes' : 'Create'}
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
