'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { conversationsQueryOptions, chatableTeachersQueryOptions, chatKeys } from '../api/queries';
import { getOrCreateConversation } from '../api/service';
import { useRealtimeConversations } from '../hooks/use-realtime-messages';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';
import { toast } from 'sonner';

// ─── New chat sheet (HOD picks a teacher to chat with) ───────────────────

interface NewChatSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (teacherId: string) => void;
}

function NewChatSheet({ open, onOpenChange, onSelect }: NewChatSheetProps) {
  const [search, setSearch] = useState('');
  const { data: teachers = [], isLoading } = useQuery({
    ...chatableTeachersQueryOptions(),
    enabled: open
  });

  const filtered = teachers.filter(
    (t) =>
      (t.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='left' className='flex h-full w-full flex-col gap-0 p-0 sm:max-w-sm'>
        <SheetHeader className='shrink-0 border-b px-5 py-4'>
          <SheetTitle>New Chat</SheetTitle>
          <SheetDescription>Select a teacher to start a conversation</SheetDescription>
        </SheetHeader>

        <div className='px-4 pt-3'>
          <div className='relative'>
            <Icons.search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <input
              type='search'
              placeholder='Search teachers…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border-border/40 bg-background w-full rounded-xl border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'
            />
          </div>
        </div>

        <ScrollArea className='flex-1 px-4 py-3'>
          {isLoading ? (
            <div className='space-y-2'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='flex items-center gap-3 rounded-xl p-2'>
                  <Skeleton className='h-9 w-9 rounded-full' />
                  <div className='space-y-1.5'>
                    <Skeleton className='h-3.5 w-28' />
                    <Skeleton className='h-3 w-36' />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>No teachers found</p>
          ) : (
            <div className='space-y-1'>
              {filtered.map((t) => {
                const name = t.full_name ?? t.email ?? 'Teacher';
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <button
                    key={t.id}
                    type='button'
                    onClick={() => {
                      onSelect(t.id);
                      onOpenChange(false);
                    }}
                    className='hover:bg-muted/50 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                  >
                    <Avatar className='h-9 w-9 shrink-0'>
                      <AvatarFallback className='bg-primary/15 text-primary text-sm'>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{name}</p>
                      <p className='text-muted-foreground truncate text-xs'>{t.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Mobile conversation select ───────────────────────────────────────────

interface MobileSelectProps {
  conversations: ReturnType<typeof conversationsQueryOptions>['queryFn'] extends () => Promise<
    infer T
  >
    ? T
    : never;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isHod: boolean;
  onNew: () => void;
}

// ─── Messenger ────────────────────────────────────────────────────────────

export function Messenger() {
  const qc = useQueryClient();
  const { user, role } = useSupabaseUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const isHod = role === 'hod';

  // Subscribe to realtime conversation updates
  useRealtimeConversations(user?.id ?? null);

  const { data: conversations = [], isLoading } = useQuery(conversationsQueryOptions());

  // Auto-select first conversation
  useState(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  });

  // Also auto-select when data loads
  const activeConversation =
    conversations.find((c) => c.id === selectedId) ??
    (conversations.length > 0 ? conversations[0] : null);

  // Create or open conversation
  const createConv = useMutation({
    mutationFn: (teacherId: string) => getOrCreateConversation({ other_user_id: teacherId }),
    onSuccess: (convId) => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      setSelectedId(convId);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (!user) return null;

  return (
    <>
      <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
        {/* Mobile: select dropdown */}
        <div className='border-border/40 bg-background/75 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur sm:rounded-3xl sm:p-4 lg:hidden'>
          <div className='flex items-center justify-between'>
            <p className='text-foreground text-sm font-semibold'>Messages</p>
            {isHod && (
              <Button
                size='sm'
                variant='outline'
                onClick={() => setNewChatOpen(true)}
                className='gap-1 rounded-full'
              >
                <Icons.add className='h-3.5 w-3.5' />
                New
              </Button>
            )}
          </div>
          {conversations.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className='border-border/40 bg-background/70 text-foreground focus:ring-primary/30 w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none'
            >
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.participant.full_name ?? c.participant.email}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Desktop: sidebar */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isHod={isHod}
          onNew={() => setNewChatOpen(true)}
          loading={isLoading}
        />

        {/* Chat area or placeholder */}
        {activeConversation ? (
          <ChatArea
            key={activeConversation.id}
            conversation={activeConversation}
            currentUserId={user.id}
          />
        ) : (
          <div className='border-border/40 bg-background/80 flex flex-col items-center justify-center gap-4 rounded-2xl border text-center lg:col-start-2 lg:col-end-3 lg:rounded-3xl'>
            <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
              <Icons.chat className='text-muted-foreground h-7 w-7' />
            </div>
            <div>
              <p className='font-semibold'>No conversation selected</p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {isHod
                  ? 'Start a new chat or select an existing conversation'
                  : 'Your conversations will appear here'}
              </p>
            </div>
            {isHod && (
              <Button onClick={() => setNewChatOpen(true)} size='sm' className='gap-2'>
                <Icons.add className='h-4 w-4' />
                Start a Chat
              </Button>
            )}
          </div>
        )}
      </div>

      {/* New chat sheet */}
      {isHod && (
        <NewChatSheet
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          onSelect={(teacherId) => createConv.mutate(teacherId)}
        />
      )}
    </>
  );
}
