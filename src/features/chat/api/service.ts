import { createClient } from '@/lib/supabase/client';
import type { Conversation, Message, SendMessagePayload, CreateConversationPayload } from './types';

function supabase() {
  return createClient();
}

// ─── Current user ─────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user }
  } = await supabase().auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getCurrentUserRole(): Promise<'hod' | 'teacher'> {
  const {
    data: { user }
  } = await supabase().auth.getUser();
  return (user?.user_metadata?.role as 'hod' | 'teacher') ?? 'teacher';
}

// ─── Conversations ────────────────────────────────────────────────────────

/**
 * Fetch all conversations for the current user, enriched with
 * the other participant's profile, last message and unread count.
 */
export async function getConversations(): Promise<Conversation[]> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const uid = user.id;
  const role = (user.user_metadata?.role as 'hod' | 'teacher') ?? 'teacher';

  // Fetch raw conversations where user is a participant
  const { data: rows, error } = await db
    .from('conversations')
    .select(`
      id, hod_id, teacher_id, updated_at,
      hod:profiles!conversations_hod_id_fkey (
        id, full_name, email, avatar_url, role
      ),
      teacher:profiles!conversations_teacher_id_fkey (
        id, full_name, email, avatar_url, role
      )
    `)
    .or(`hod_id.eq.${uid},teacher_id.eq.${uid}`)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  // For each conversation, get the last message + unread count
  const conversations: Conversation[] = await Promise.all(
    (rows ?? []).map(async (row: any) => {
      const participant = role === 'hod' ? row.teacher : row.hod;

      // Last message
      const { data: lastMsgs } = await db
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', row.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const last = lastMsgs?.[0];

      // Unread count (messages NOT sent by me that are unread)
      const { count } = await db
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', row.id)
        .eq('is_read', false)
        .neq('sender_id', uid);

      return {
        id: row.id,
        participant: {
          id: participant?.id ?? '',
          full_name: participant?.full_name ?? null,
          email: participant?.email ?? null,
          avatar_url: participant?.avatar_url ?? null,
          role: participant?.role ?? (role === 'hod' ? 'teacher' : 'hod')
        },
        last_message: last?.content ?? null,
        last_message_at: last?.created_at ?? null,
        unread_count: count ?? 0,
        updated_at: row.updated_at
      };
    })
  );

  return conversations;
}

/**
 * Get or create a conversation between the current user and another user.
 * Returns the conversation ID.
 */
export async function getOrCreateConversation(payload: CreateConversationPayload): Promise<string> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const role = (user.user_metadata?.role as 'hod' | 'teacher') ?? 'teacher';
  const hod_id = role === 'hod' ? user.id : payload.other_user_id;
  const teacher_id = role === 'teacher' ? user.id : payload.other_user_id;

  // Try to find existing conversation
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('hod_id', hod_id)
    .eq('teacher_id', teacher_id)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await db
    .from('conversations')
    .insert({ hod_id, teacher_id })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

// ─── Messages ─────────────────────────────────────────────────────────────

/**
 * Fetch all messages for a conversation, oldest first.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await db
    .from('messages')
    .select('id, conversation_id, sender_id, content, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    is_mine: row.sender_id === user.id
  }));
}

/**
 * Send a message and mark all incoming messages in the conversation as read.
 */
export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert message
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: payload.conversation_id,
      sender_id: user.id,
      content: payload.content.trim()
    })
    .select('id, conversation_id, sender_id, content, is_read, created_at')
    .single();

  if (error) throw new Error(error.message);

  // Mark all unread messages from the other person as read
  void db
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', payload.conversation_id)
    .eq('is_read', false)
    .neq('sender_id', user.id);

  return { ...data, is_mine: true };
}

/**
 * Mark all unread messages in a conversation as read.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const db = supabase();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) return;

  await db
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
    .neq('sender_id', user.id);
}

/**
 * Fetch all teachers (used by HOD to start a new conversation).
 */
export async function getChatableTeachers(): Promise<
  { id: string; full_name: string | null; email: string | null }[]
> {
  const res = await fetch('/api/teachers', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load teachers');
  const body = (await res.json()) as { teachers: any[] };
  return body.teachers;
}
