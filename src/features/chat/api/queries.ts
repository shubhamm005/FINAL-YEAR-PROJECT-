import { queryOptions } from '@tanstack/react-query';
import { getConversations, getMessages, getChatableTeachers } from './service';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  messages: (convId: string) => [...chatKeys.all, 'messages', convId] as const,
  chatableTeachers: () => [...chatKeys.all, 'chatable-teachers'] as const
};

export const conversationsQueryOptions = () =>
  queryOptions({
    queryKey: chatKeys.conversations(),
    queryFn: () => getConversations(),
    staleTime: 30_000
  });

export const messagesQueryOptions = (conversationId: string) =>
  queryOptions({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () => getMessages(conversationId),
    staleTime: 0, // always re-fetch (Realtime keeps it live)
    enabled: !!conversationId
  });

export const chatableTeachersQueryOptions = () =>
  queryOptions({
    queryKey: chatKeys.chatableTeachers(),
    queryFn: () => getChatableTeachers(),
    staleTime: 60_000
  });
