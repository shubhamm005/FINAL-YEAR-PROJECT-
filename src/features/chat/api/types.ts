// ─── Database row shapes ──────────────────────────────────────────────────

export interface DbConversation {
  id: string;
  hod_id: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ─── App-level types ──────────────────────────────────────────────────────

export interface ChatProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'hod' | 'teacher';
}

/** A conversation enriched with the other participant's profile */
export interface Conversation {
  id: string;
  participant: ChatProfile; // the other person (HOD sees teacher, teacher sees HOD)
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean; // true when sender_id === current user id
}

// ─── Service payloads ────────────────────────────────────────��────────────

export interface SendMessagePayload {
  conversation_id: string;
  content: string;
}

export interface CreateConversationPayload {
  other_user_id: string; // teacher_id (HOD starts) or hod_id (teacher starts)
}
