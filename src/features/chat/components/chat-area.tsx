'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesQueryOptions, chatKeys } from '../api/queries';
import { sendMessage, markConversationRead } from '../api/service';
import { useRealtimeMessages } from '../hooks/use-realtime-messages';
import type { Conversation, Message } from '../api/types';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(iso));
}

function getInitials(name: string | null, email: string | null) {
  return (name ?? email ?? '?').slice(0, 2).toUpperCase();
}

// ─── Message bubble ───────────────────────────────────────────────────────

function MsgBubble({
  msg,
  shouldReduceMotion
}: {
  msg: Message;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'flex max-w-[80%] flex-col gap-0.5',
        msg.is_mine ? 'ml-auto items-end' : 'items-start'
      )}
    >
      <div
        className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          msg.is_mine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {msg.content}
      </div>
      <div className='flex items-center gap-1'>
        <span className='text-muted-foreground text-[0.65rem]'>{fmtTime(msg.created_at)}</span>
        {msg.is_mine && (
          <Icons.checks
            className={cn('h-3 w-3', msg.is_read ? 'text-primary' : 'text-muted-foreground')}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyMessages({ name }: { name: string }) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center'>
      <div className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'>
        <Icons.chat className='text-muted-foreground h-6 w-6' />
      </div>
      <div>
        <p className='font-semibold text-sm'>Start the conversation</p>
        <p className='text-muted-foreground text-xs mt-0.5'>Send a message to {name}</p>
      </div>
    </div>
  );
}

// ─── Chat area ────────────────────────────────────────────────────────────

interface ChatAreaProps {
  conversation: Conversation;
  currentUserId: string;
}

export function ChatArea({ conversation, currentUserId }: ChatAreaProps) {
  const qc = useQueryClient();
  const shouldReduce = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  const { data: messages = [], isLoading } = useQuery(messagesQueryOptions(conversation.id));

  // Subscribe to realtime updates
  useRealtimeMessages(conversation.id, currentUserId);

  // Mark as read when conversation opens
  useEffect(() => {
    void markConversationRead(conversation.id);
    void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
  }, [conversation.id, qc]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: shouldReduce ? 'auto' : 'smooth'
    });
  }, [messages.length, shouldReduce]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage({ conversation_id: conversation.id, content }),
    onMutate: async (content) => {
      // Optimistic update
      const optimistic: Message = {
        id: 'optimistic-' + Date.now(),
        conversation_id: conversation.id,
        sender_id: currentUserId,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        is_mine: true
      };
      qc.setQueryData<Message[]>(chatKeys.messages(conversation.id), (prev) => [
        ...(prev ?? []),
        optimistic
      ]);
      return { optimistic };
    },
    onSuccess: (real, _, ctx) => {
      // Replace optimistic with real message
      qc.setQueryData<Message[]>(chatKeys.messages(conversation.id), (prev) =>
        (prev ?? []).map((m) => (m.id === ctx?.optimistic.id ? real : m))
      );
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (e: Error, _, ctx) => {
      // Remove optimistic on error
      qc.setQueryData<Message[]>(chatKeys.messages(conversation.id), (prev) =>
        (prev ?? []).filter((m) => m.id !== ctx?.optimistic.id)
      );
      toast.error(e.message);
    }
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sendMutation.isPending) return;
    const content = draft.trim();
    setDraft('');
    sendMutation.mutate(content);
  }

  const name = conversation.participant.full_name ?? conversation.participant.email ?? 'Unknown';
  const initials = getInitials(conversation.participant.full_name, conversation.participant.email);

  return (
    <div className='border-border/40 bg-background/80 flex min-h-0 flex-col overflow-hidden rounded-2xl border backdrop-blur lg:col-start-2 lg:col-end-3 lg:rounded-3xl'>
      {/* Header */}
      <header className='flex items-center gap-3 border-b px-4 py-3'>
        <Avatar className='h-9 w-9 rounded-2xl border shrink-0'>
          <AvatarImage src={conversation.participant.avatar_url ?? ''} alt={name} />
          <AvatarFallback className='bg-primary/15 text-primary rounded-2xl text-sm font-medium'>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <p className='text-foreground truncate text-sm font-semibold'>{name}</p>
          <p className='text-muted-foreground text-xs capitalize'>
            {conversation.participant.role}
          </p>
        </div>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='icon' aria-label='Call'>
            <Icons.phone className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='icon' aria-label='Video'>
            <Icons.video className='h-4 w-4' />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4'>
        {isLoading ? (
          <div className='space-y-3'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-56')} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyMessages name={name} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MsgBubble key={msg.id} msg={msg} shouldReduceMotion={shouldReduce} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className='border-t px-4 py-3'>
        <div className='border-border/40 bg-background/80 flex items-end gap-2 rounded-2xl border p-3'>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.closest('form')?.requestSubmit();
              }
            }}
            placeholder={`Message ${name}…`}
            rows={1}
            className='min-h-[2.5rem] flex-1 resize-none border-none bg-transparent text-sm focus-visible:ring-0 focus-visible:outline-none'
          />
          <Button
            type='submit'
            size='icon'
            className='h-9 w-9 shrink-0 rounded-full'
            disabled={!draft.trim() || sendMutation.isPending}
            aria-label='Send'
          >
            {sendMutation.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <Icons.send className='h-4 w-4' />
            )}
          </Button>
        </div>
        <p className='text-muted-foreground mt-1.5 text-center text-[0.65rem]'>
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
