'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { LoadingButton } from '@/components/ui/loading-button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { workKeys } from '@/features/work/api/queries';
import { updateMyResponsibility, uploadAttachment } from '@/features/work/api/service';
import {
  TASK_STATUS_LABELS,
  type MyResponsibility,
  type TaskStatus
} from '@/features/work/api/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Status picker ────────────────────────────────────────────────────────

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'verified'];

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: 'border-border text-muted-foreground hover:border-primary/50',
  in_progress: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  completed: 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  verified: 'border-primary bg-primary/10 text-primary'
};

const STATUS_SELECTED: Record<TaskStatus, string> = {
  pending: 'border-primary bg-primary/5 text-primary',
  in_progress: 'border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'border-green-500 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  verified: 'border-primary bg-primary/20 text-primary font-semibold'
};

// ─── File drop zone ───────────────────────────────────────────────────────

interface FileDropZoneProps {
  file: File | null;
  existingUrl: string | null;
  uploadProgress: number | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled: boolean;
}

function FileDropZone({
  file,
  existingUrl,
  uploadProgress,
  onFile,
  onClear,
  disabled
}: FileDropZoneProps) {
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
        Attachment
        <span className='text-muted-foreground ml-1 text-xs font-normal'>
          (PDF, Word, Excel, PPT, image — max 10 MB)
        </span>
      </Label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging && 'border-primary bg-primary/5',
          !dragging && !disabled && 'hover:border-primary/60 hover:bg-muted/40',
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
          <p className='text-muted-foreground text-xs'>Supports PDF, Word, Excel, PPT, images</p>
        </div>
      </div>

      {/* File info / progress */}
      {(file || existingUrl) && (
        <div className='rounded-lg border bg-muted/30 px-3 py-2.5'>
          <div className='flex items-center gap-2'>
            <Icons.fileTypePdf className='text-muted-foreground h-4 w-4 shrink-0' />
            <span className='min-w-0 flex-1 truncate text-sm font-medium'>{fileName}</span>
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

          {/* Upload progress bar */}
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

// ─── Main sheet ───────────────────────────────────────────────────────────

interface UpdateProgressSheetProps {
  item: MyResponsibility;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UpdateProgressSheet({ item, open, onOpenChange }: UpdateProgressSheetProps) {
  const qc = useQueryClient();
  const [loading, startTransition] = useTransition();

  // Local state
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(item.task_status);
  const [progress, setProgress] = useState(item.progress);
  const [remarks, setRemarks] = useState(item.remarks ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(item.attachment_url);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Sync state when item changes (sheet re-opens for different item)
  const resetState = () => {
    setTaskStatus(item.task_status);
    setProgress(item.progress);
    setRemarks(item.remarks ?? '');
    setFile(null);
    setExistingUrl(item.attachment_url);
    setUploadProgress(null);
  };

  // Auto-set progress when status changes
  const handleStatusChange = (s: TaskStatus) => {
    setTaskStatus(s);
    if (s === 'completed' || s === 'verified') setProgress(100);
    else if (s === 'pending' && progress === 100) setProgress(0);
  };

  // Auto-set status when progress reaches 100
  const handleProgressChange = (v: number) => {
    setProgress(v);
    if (v === 100 && taskStatus === 'pending') setTaskStatus('in_progress');
    if (v === 100 && taskStatus === 'in_progress') setTaskStatus('completed');
  };

  async function handleSubmit() {
    startTransition(async () => {
      try {
        let attachmentUrl = existingUrl;

        // Upload new file if selected
        if (file) {
          setUploadProgress(0);
          attachmentUrl = await uploadAttachment(item.id, file, (pct) => {
            setUploadProgress(pct);
          });
          setUploadProgress(100);
          setExistingUrl(attachmentUrl);
          setFile(null);
        }

        await updateMyResponsibility(item.id, {
          task_status: taskStatus,
          progress,
          remarks: remarks.trim() || undefined,
          attachment_url: attachmentUrl
        });

        void qc.invalidateQueries({ queryKey: workKeys.myResponsibilities() });
        toast.success('Progress updated successfully');
        onOpenChange(false);
      } catch (e) {
        toast.error((e as Error).message);
        setUploadProgress(null);
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) resetState();
        }
      }}
    >
      <SheetContent side='right' className='flex h-full w-full flex-col gap-0 p-0 sm:max-w-md'>
        {/* Header */}
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='flex items-center gap-2'>
            <Icons.clipboardCheck className='text-primary h-4 w-4' />
            Update Progress
          </SheetTitle>
          <SheetDescription className='line-clamp-2 text-xs'>{item.title}</SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <ScrollArea className='min-h-0 flex-1'>
          <div className='space-y-6 px-6 py-5'>
            {/* ── Task Status ─────────────────────────────────────── */}
            <div className='space-y-3'>
              <Label className='text-sm font-medium'>Task Status</Label>
              <div className='grid grid-cols-2 gap-2'>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type='button'
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      taskStatus === s ? STATUS_SELECTED[s] : STATUS_STYLE[s]
                    )}
                  >
                    {TASK_STATUS_LABELS[s]}
                    {taskStatus === s && <Icons.check className='float-right mt-0.5 h-4 w-4' />}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Progress slider ──────────────────────────────────── */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-medium'>Completion Progress</Label>
                <Badge variant='outline' className='tabular-nums'>
                  {progress}%
                </Badge>
              </div>

              {/* Custom range slider */}
              <div className='space-y-2'>
                <input
                  type='range'
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  disabled={loading}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className='h-2 w-full cursor-pointer appearance-none rounded-full accent-primary disabled:cursor-not-allowed'
                />
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <Progress value={progress} className='h-2' />
            </div>

            <Separator />

            {/* ── Remarks ──────────────────────────────────────────── */}
            <div className='space-y-2'>
              <Label htmlFor='remarks' className='text-sm font-medium'>
                Remarks / Update Notes
              </Label>
              <Textarea
                id='remarks'
                placeholder='Add any comments, updates, or notes for the HOD…'
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={loading}
                rows={4}
                className='resize-none'
              />
            </div>

            <Separator />

            {/* ── File attachment ───────────────────────────────────── */}
            <FileDropZone
              file={file}
              existingUrl={existingUrl}
              uploadProgress={uploadProgress}
              onFile={setFile}
              onClear={() => {
                setFile(null);
                setExistingUrl(null);
              }}
              disabled={loading}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className='shrink-0 border-t bg-background px-6 py-4'>
          <div className='flex gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                onOpenChange(false);
                resetState();
              }}
              disabled={loading}
              className='flex-1'
            >
              Cancel
            </Button>
            <LoadingButton loading={loading} onClick={handleSubmit} className='flex-1'>
              Save Progress
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
