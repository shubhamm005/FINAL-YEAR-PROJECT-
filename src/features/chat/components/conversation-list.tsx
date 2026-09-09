'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Conversation } from '../api/types';

function fmtTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
}

function getInitials(name: string | null, email: string | null) {
  const src = name ?? email ?? '?';
  return src.slice(0, 2).toUpperCase();
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

export function ConversationListSkeleton() {
  return (
    <div className='space-y-2 p-3'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='flex items-center gap-3 rounded-2xl p-3'>
          <Skeleton className='h-10 w-10 rounded-2xl shrink-0' />
          <div className='flex-1 space-y-1.5'>
            <Skeleton className='h-3.5 w-28' />
            <Skeleton className='h-3 w-40' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── New conversation button (HOD only) ──────────────────────────────────

interface NewConversationButtonProps {
  onNew: () => void;
}

export function NewConversationButton({ onNew }: NewConversationButtonProps) {
  return (
    <Button size='sm' variant='outline' onClick={onNew} className='w-full gap-2 rounded-2xl'>
      <Icons.add className='h-3.5 w-3.5' />
      New Chat
    </Button>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isHod: boolean;
  onNew?: () => void;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isHod,
  onNew,
  loading
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.participant.full_name ?? '').toLowerCase().includes(q) ||
        (c.participant.email ?? '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className='border-border/40 bg-background/75 hidden h-full flex-col gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-foreground text-sm font-semibold'>Messages</p>
          <p className='text-muted-foreground text-xs'>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        {totalUnread > 0 && (
          <Badge className='rounded-full px-2 py-0.5 text-[0.7rem]'>{totalUnread} new</Badge>
        )}
      </div>

      {/* New chat (HOD only) */}
      {isHod && onNew && <NewConversationButton onNew={onNew} />}

      {/* Search */}
      <div className='relative'>
        <Icons.search className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
        <Input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search…'
          className='border-border/40 bg-background/60 rounded-2xl pl-9 text-sm'
        />
      </div>

      {/* List */}
      <div className='flex-1 space-y-1.5 overflow-y-auto pr-1' role='list'>
        {loading ? (
          <ConversationListSkeleton />
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-10 text-center'>
            <Icons.chat className='text-muted-foreground h-8 w-8' />
            <p className='text-muted-foreground text-xs'>
              {search
                ? 'No results found'
                : isHod
                  ? 'Start a chat with a teacher'
                  : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === selectedId;
            const initials = getInitials(conv.participant.full_name, conv.participant.email);
            const name = conv.participant.full_name ?? conv.participant.email ?? 'Unknown';

            return (
              <button
                key={conv.id}
                type='button'
                onClick={() => onSelect(conv.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'focus-visible:ring-primary/50 group relative flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all focus-visible:ring-2 focus-visible:outline-none',
                  isActive
                    ? 'border-primary/40 bg-primary/10'
                    : 'bg-background/70 hover:border-border/40 hover:bg-muted/40'
                )}
                role='listitem'
              >
                <Avatar className='border-border/40 h-10 w-10 rounded-2xl border shrink-0'>
                  <AvatarImage src={conv.participant.avatar_url ?? ''} alt={name} />
                  <AvatarFallback className='bg-primary/15 text-primary rounded-2xl text-sm font-medium'>
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className='min-w-0 flex-1 space-y-0.5'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='text-foreground truncate text-sm font-semibold'>{name}</p>
                    <span className='text-muted-foreground shrink-0 text-[0.65rem]'>
                      {fmtTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className='text-muted-foreground line-clamp-1 text-xs'>
                    {conv.last_message ?? 'No messages yet'}
                  </p>
                </div>

                {conv.unread_count > 0 && (
                  <span className='bg-primary text-primary-foreground ml-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full text-[0.65rem] font-semibold shrink-0'>
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
