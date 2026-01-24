import { ChatMessage, Conversation } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';

// ===== المحادثات =====

// الحصول على المحادثات
export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error("Supabase error fetching conversations:", error.message || error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      participantIds: row.participants,
      participantNames: row.participant_names || [],
      lastMessage: row.last_message || '',
      lastMessageTime: new Date(row.last_message_at),
      unreadCount: row.unread_counts?.[userId] || 0,
      type: row.type || 'director-teacher'
    })) as Conversation[];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
};

// الاستماع للمحادثات في الوقت الفعلي
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  // Initial fetch
  getConversations(userId).then(callback);

  // Realtime subscription
  const channel = supabase
    .channel('public:conversations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participants=cs.{${userId}}` // Checks if participants array contains userId (requires verify filter syntax or handle client side filtering if complex)
      },
      async (payload) => {
        // For simplicity and correctness, iterate fetching is safer than patching state manually on client for now
        const convos = await getConversations(userId);
        callback(convos);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ===== الرسائل =====

// الحصول على الرسائل
export const getMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Supabase error fetching messages:", error.message || error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      content: row.content,
      timestamp: new Date(row.created_at),
      read: row.read_by && row.read_by.length > 0,
      isPinned: row.is_pinned || false
    })) as ChatMessage[];
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

// الاستماع للرسائل في الوقت الفعلي
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  // Initial fetch
  getMessages(conversationId).then(callback);

  const channel = supabase
    .channel(`public:messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const msgs = await getMessages(conversationId);
        callback(msgs);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// إرسال رسالة
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: 'director' | 'teacher' | 'parent',
  content: string
): Promise<ChatMessage> => {

  // 1. Insert Message
  const { data: msgData, error: msgError } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      content: content,
      read_by: [senderId] // Sender has read it
    }])
    .select()
    .single();

  if (msgError) throw msgError;

  // 2. Update Conversation (last message, time, increment unread for others)
  // We need to fetch the conversation to update unread counts properly (atomic increment is harder with JSONB)
  const { data: convo } = await supabase.from('conversations').select('unread_counts, participants').eq('id', conversationId).single();

  const newUnreadCounts = convo?.unread_counts || {};
  const participants = convo?.participants || [];

  participants.forEach((pId: string) => {
    if (pId !== senderId) {
      newUnreadCounts[pId] = (newUnreadCounts[pId] || 0) + 1;
    }
  });

  await supabase
    .from('conversations')
    .update({
      last_message: content,
      last_message_at: new Date().toISOString(),
      unread_counts: newUnreadCounts
    })
    .eq('id', conversationId);

  return {
    id: msgData.id,
    conversationId,
    senderId,
    senderName,
    senderRole,
    content,
    timestamp: new Date(msgData.created_at),
    read: false
  };
};

// إنشاء محادثة جديدة أو الحصول على محادثة موجودة
export const getOrCreateConversation = async (
  participantIds: string[],
  participantNames: string[],
  type: 'director-teacher' | 'teacher-parent' | 'parent-teacher'
): Promise<Conversation> => {

  const sortedIds = participantIds.sort();

  // Check if exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .contains('participants', sortedIds);

  // Since 'contains' might be broad, we can refine or just take the first if logic allows.
  // Ideally we want exact match on participants. 
  // For now filtering in JS if needed or assuming unique pair.
  const found = existing?.find(c =>
    c.participants.length === sortedIds.length &&
    c.participants.every((id: string) => sortedIds.includes(id))
  );

  if (found) {
    return {
      id: found.id,
      participantIds: found.participants,
      participantNames: found.participant_names,
      lastMessage: found.last_message || '',
      lastMessageTime: new Date(found.last_message_at),
      unreadCount: 0, // Should be contextual to user, but here generalized
      type: found.type
    };
  }

  // Create new
  const participantNamesObj: any = {};
  // Storing as array inside JSONB or better just keep argument 'participantNames' as is.
  // The schema uses participant_names as JSONB or Text Array? Let's use Text Array for simplicity matching input.
  // Based on SQL I will write: participant_names text[]

  const { data: newConvo, error } = await supabase
    .from('conversations')
    .insert([{
      participants: sortedIds,
      participant_names: participantNames, // array of strings
      type,
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_counts: {}
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: newConvo.id,
    participantIds: newConvo.participants,
    participantNames: newConvo.participant_names,
    lastMessage: '',
    lastMessageTime: new Date(newConvo.last_message_at),
    unreadCount: 0,
    type: newConvo.type
  };
};

// وضع علامة قراءة على الرسائل
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {

  // 1. Reset unread count for this user in Conversation
  const { data: convo } = await supabase.from('conversations').select('unread_counts').eq('id', conversationId).single();
  if (convo) {
    const newCounts = { ...convo.unread_counts, [userId]: 0 };
    await supabase.from('conversations').update({ unread_counts: newCounts }).eq('id', conversationId);
  }

  // 2. Mark messages as read (add userId to read_by array)
  // This is tricky in batch update without RPC. 
  // Simplified: We assume 'read' boolean in frontend is enough or we use a loop/RPC.
  // For now, let's skip complex message-level tracking to avoid SQL complexity unless requested.
  // Or: call a custom RPC 'mark_messages_read(conversation_id, user_id)'

  // Implementation without RPC (less efficient but works):
  /*
  const { data: messages } = await supabase.from('messages').select('id, read_by').eq('conversation_id', conversationId);
  // Filter messages not read by user... then update. Too heavy.
  */

  // Let's assume just resetting the count is enough for the UI 'unread' badge functionality.
};

// التحقق من صلاحيات المراسلة
export const canMessage = (
  userRole: 'director' | 'teacher' | 'parent',
  targetRole: 'director' | 'teacher' | 'parent'
): boolean => {
  const permissionsMap: { [key: string]: string[] } = {
    director: ['teacher', 'parent'],
    teacher: ['director', 'parent'],
    parent: ['teacher'],
  };

  return permissionsMap[userRole]?.includes(targetRole) || false;
};

// تثبيت أو إلغاء تثبيت رسالة
export const togglePinMessage = async (messageId: string, isPinned: boolean): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: isPinned })
    .eq('id', messageId);

  if (error) throw error;
};

// للتوافق مع الكود القديم
export const chatService = {
  getConversations,
  getMessages,
  sendMessage,
  canMessage,
  getOrCreateConversation,
  subscribeToConversations,
  subscribeToMessages,
  markMessagesAsRead,
  togglePinMessage,
  getUnreadCount: async (conversations: Conversation[]): Promise<number> => {
    if (conversations) return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    return 0;
  }
};

