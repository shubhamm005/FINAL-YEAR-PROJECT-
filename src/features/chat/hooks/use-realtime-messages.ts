'use client';

import { createClient } from '@/lib/supabase/client';
import { chatKeys } from '@/features/chat/api/queries';
import type { Message } from '@/features/chat/api/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Subscribes to Supabase Realtime postgres_changes on the messages table
 * for the given conversationId.
 *
 * When a new INSERT arrives:
 *  - appends it to the React Query cache for that conversation
 *  - invalidates the conversations list so unread counts + last message refresh
 */
export function useRealtimeMessages(conversationId: string | null, currentUserId: string | null) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const supabase = createClient();

    // Unique channel name per conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const row = payload.new as any;

          const newMsg: Message = {
            id: row.id,
            conversation_id: row.conversation_id,
            sender_id: row.sender_id,
            content: row.content,
            is_read: row.is_read,
            created_at: row.created_at,
            is_mine: row.sender_id === currentUserId
          };

          // Append to messages cache
          qc.setQueryData<Message[]>(chatKeys.messages(conversationId), (prev) => {
            if (!prev) return [newMsg];
            // Avoid duplicates (optimistic update may already have added it)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Refresh conversation list (unread count + last message)
          void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, currentUserId, qc]);
}

/**
 * Subscribes to conversations table changes so the sidebar list
 * updates in real-time when a new conversation is created or
 * updated_at changes (new message from any conversation).
 */
export function useRealtimeConversations(currentUserId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`conversations:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, qc]);
}
