import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'director' | 'teacher' | 'parent';
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  type: 'director-teacher' | 'teacher-parent' | 'parent-teacher';
}

interface ChatStoreState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: ChatMessage[];
  unreadCount: number;
  userRole: 'director' | 'teacher' | 'parent' | null;
  userId: string | null;
  
  // Actions
  setUserRole: (role: 'director' | 'teacher' | 'parent') => void;
  setUserId: (id: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  selectConversation: (conversation: Conversation) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  markAsRead: (conversationId: string) => void;
  setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  unreadCount: 0,
  userRole: null,
  userId: null,

  setUserRole: (role) => set({ userRole: role }),
  setUserId: (id) => set({ userId: id }),
  
  setConversations: (conversations) =>
    set((state) => ({
      conversations,
      unreadCount: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
    })),

  selectConversation: (conversation) =>
    set({ selectedConversation: conversation }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => {
      const updatedConversations = state.conversations.map((conv) =>
        conv.id === message.conversationId
          ? {
              ...conv,
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              unreadCount: message.read ? conv.unreadCount : conv.unreadCount + 1,
            }
          : conv
      );
      const totalUnread = updatedConversations.reduce(
        (sum, conv) => sum + conv.unreadCount,
        0
      );
      return {
        messages: [...state.messages, message],
        conversations: updatedConversations,
        unreadCount: totalUnread,
      };
    }),

  markAsRead: (conversationId) =>
    set((state) => {
      const updatedConversations = state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );
      const totalUnread = updatedConversations.reduce(
        (sum, conv) => sum + conv.unreadCount,
        0
      );
      return {
        messages: state.messages.map((msg) =>
          msg.conversationId === conversationId ? { ...msg, read: true } : msg
        ),
        conversations: updatedConversations,
        unreadCount: totalUnread,
      };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
