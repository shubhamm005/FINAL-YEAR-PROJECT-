'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  unassignTeacher,
  uploadHodAttachment
} from '@/features/work/api/service';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type Category,
  type Priority,
  type Responsibility,
  type TeacherProfile
} from '@/features/work/api/types';
import { cn } from '@/lib/utils';
import { useAppForm } from '@/lib/form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

// ─── Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string(),
  category: z.enum(['academic', 'administrative', 'event', 'lab', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string() // ISO date string or ''
});

// ─── Teacher picker row ───────────────────────────────────────────────────

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
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
        ${
          selected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-muted/40'
        }`}
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

// ─── HOD file drop zone ───────────────────────────────────────────────────

interface HodFileDropZoneProps {
  file: File | null;
  existingUrl: string | null;
  uploadProgress: number | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled: boolean;
}

function HodFileDropZone({
  file,
  existingUrl,
  uploadProgress,
  onFile,
  onClear,
  disabled
}: HodFileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [onFile]
  );

  const fileName = file?.name ?? (existingUrl ? existingUrl.split('/').pop() : null);

  return (
    <div className='space-y-2'>
      <Label className='text-sm font-medium'>
        Instruction / Reference Document
        <span className='text-muted-foreground ml-1 font-normal'>(optional)</span>
      </Label>
      <p className='text-muted-foreground text-xs'>
        Attach a PDF, Word, Excel or image to give teachers additional context. Max 10 MB.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging && 'border-primary bg-primary/5',
          !dragging && !disabled && 'hover:border-primary/60 hover:bg-muted/30',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type='file'
          className='hidden'
          accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt'
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-full'>
          <Icons.upload className='text-muted-foreground h-5 w-5' />
        </div>
        <div>
          <p className='text-sm font-medium'>
            {file ? 'Change file' : 'Drag & drop or click to upload'}
          </p>
          <p className='text-muted-foreground text-xs'>PDF, Word, Excel, PPT, image · max 10 MB</p>
        </div>
      </div>

      {/* File preview / progress */}
      {(file || existingUrl) && (
        <div className='rounded-lg border bg-muted/30 px-3 py-2.5'>
          <div className='flex items-center gap-2'>
            <Icons.fileTypePdf className='text-muted-foreground h-4 w-4 shrink-0' />
            <span className='min-w-0 flex-1 truncate text-sm'>{fileName}</span>
            {existingUrl && !file && (
              <a
                href={existingUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary shrink-0 text-xs hover:underline'
                onClick={(e) => e.stopPropagation()}
              >
                View
              </a>
            )}
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className='text-muted-foreground hover:text-foreground shrink-0'
            >
              <Icons.close className='h-3.5 w-3.5' />
            </button>
          </div>

          {uploadProgress !== null && uploadProgress < 100 && (
            <div className='mt-2 space-y-1'>
              <div className='flex justify-between text-xs text-muted-foreground'>
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className='h-1' />
            </div>
          )}
          {uploadProgress === 100 && (
            <p className='mt-1 flex items-center gap-1 text-xs text-green-600'>
              <Icons.circleCheck className='h-3.5 w-3.5' />
              Upload complete
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────

interface AddResponsibilitySheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editItem?: Responsibility | null;
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

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(editItem?.attachment_url ?? null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIds(editItem ? new Set(editItem.assigned_teachers.map((t) => t.id)) : new Set());
    setExistingUrl(editItem?.attachment_url ?? null);
    setAttachFile(null);
    setUploadPct(null);
  }, [editItem]);

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

  const [loading, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      title: editItem?.title ?? '',
      description: editItem?.description ?? '',
      category: (editItem?.category ?? 'academic') as Category,
      priority: (editItem?.priority ?? 'medium') as Priority,
      due_date: editItem?.due_date ?? ''
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        try {
          // Upload file first if one is selected
          let attachmentUrl = existingUrl;
          if (attachFile) {
            setUploadPct(0);
            attachmentUrl = await uploadHodAttachment(
              attachFile,
              isEditing ? editItem?.id : undefined,
              (pct) => setUploadPct(pct)
            );
            setUploadPct(100);
            setExistingUrl(attachmentUrl);
            setAttachFile(null);
          }

          if (isEditing && editItem) {
            await updateResponsibility(editItem.id, {
              title: value.title,
              description: value.description || undefined,
              category: value.category,
              priority: value.priority,
              due_date: value.due_date || null,
              attachment_url: attachmentUrl
            });

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
              category: value.category,
              priority: value.priority,
              due_date: value.due_date || undefined,
              attachment_url: attachmentUrl ?? undefined,
              teacherIds: [...selectedIds]
            });
            toast.success('Responsibility created');
          }

          void qc.invalidateQueries({ queryKey: workKeys.all });
          setOpen(false);
          form.reset();
          setSelectedIds(new Set());
          setTeacherSearch('');
          setAttachFile(null);
          setExistingUrl(null);
          setUploadPct(null);
        } catch (e) {
          toast.error((e as Error).message);
          setUploadPct(null);
        }
      });
    }
  });

  useEffect(() => {
    form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger render={<span />}>{trigger}</SheetTrigger>}

      <SheetContent side='right' className='flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg'>
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle>{isEditing ? 'Edit Responsibility' : 'Add Responsibility'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update responsibility details and teacher assignments.'
              : 'Fill in the details and assign teachers.'}
          </SheetDescription>
        </SheetHeader>

        <form
          className='flex min-h-0 flex-1 flex-col'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <ScrollArea className='min-h-0 flex-1'>
            <div className='space-y-5 px-6 py-5'>
              {/* ── Basic info ──────────────────────────────────────── */}
              <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Basic Info
              </p>
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
                      placeholder='Describe the responsibility in detail…'
                      disabled={loading}
                    />
                  )}
                />
              </FieldGroup>

              <Separator />

              {/* ── Classification ──────────────────────────────────── */}
              <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Classification
              </p>
              <div className='grid grid-cols-2 gap-3'>
                <form.AppField
                  name='category'
                  children={(field) => (
                    <field.SelectField
                      label='Category'
                      placeholder='Select category'
                      options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({
                        value: v,
                        label: l
                      }))}
                    />
                  )}
                />
                <form.AppField
                  name='priority'
                  children={(field) => (
                    <field.SelectField
                      label='Priority'
                      placeholder='Select priority'
                      options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({
                        value: v,
                        label: l
                      }))}
                    />
                  )}
                />
              </div>

              <form.Field
                name='due_date'
                children={(field) => (
                  <div className='space-y-1.5'>
                    <Label htmlFor='due_date' className='text-sm font-medium'>
                      Due Date
                    </Label>
                    <Input
                      id='due_date'
                      type='date'
                      disabled={loading}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />

              <Separator />

              {/* ── Instruction document ────────────────────────────── */}
              <HodFileDropZone
                file={attachFile}
                existingUrl={existingUrl}
                uploadProgress={uploadPct}
                onFile={setAttachFile}
                onClear={() => {
                  setAttachFile(null);
                  setExistingUrl(null);
                  setUploadPct(null);
                }}
                disabled={loading}
              />

              <Separator />

              {/* ── Assign teachers ─────────────────────────────────── */}
              <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Assign Teachers
              </p>

              <div className='relative'>
                <Icons.search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                <Input
                  placeholder='Search teachers…'
                  className='pl-9'
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
              </div>

              {/* Selected chips */}
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
                      Teachers appear here once they sign up with the <strong>Teacher</strong> role.
                    </p>
                  )}
                </div>
              ) : (
                <div className='space-y-2 pb-2'>
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
          </ScrollArea>

          <div className='shrink-0 border-t bg-background px-6 py-4'>
            <div className='flex gap-3'>
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
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
