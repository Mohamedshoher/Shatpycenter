import { useState, useEffect, useCallback } from 'react';
import { useChatStore, ChatMessage, Conversation } from '@/store/useChatStore';
import { chatService } from '@/features/chat/services/chatService';

export const useChat = (userId: string, userRole: 'director' | 'teacher' | 'parent') => {
  const {
    conversations,
    selectedConversation,
    messages,
    unreadCount,
    setUserRole,
    setUserId,
    setConversations,
    selectConversation,
    setMessages,
    addMessage,
    markAsRead,
    setUnreadCount,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize user
  useEffect(() => {
    setUserId(userId);
    setUserRole(userRole);
  }, [userId, userRole, setUserId, setUserRole]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const data = await chatService.getConversations(userId);
        setConversations(data);
      } catch (err) {
        setError('خطأ في تحميل المحادثات');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadConversations();
    }
  }, [userId, setConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        const data = await chatService.getMessages(selectedConversation.id);
        setMessages(data);
        
        // Mark conversation as read if there are unread messages
        const hasUnread = data.some((msg) => !msg.read && msg.senderId !== userId);
        if (hasUnread) {
          markAsRead(selectedConversation.id);
        }
      } catch (err) {
        setError('خطأ في تحميل الرسائل');
      }
    };

    loadMessages();
  }, [selectedConversation, setMessages, markAsRead, userId]);

  // Select conversation
  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      selectConversation(conversation);
    },
    [selectConversation]
  );

  // Send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation || !content.trim()) return;

      setSending(true);
      try {
        const newMessage = await chatService.sendMessage(
          selectedConversation.id,
          userId,
          'أنت',
          userRole,
          content
        );
        addMessage(newMessage);
      } catch (err) {
        setError('خطأ في إرسال الرسالة');
      } finally {
        setSending(false);
      }
    },
    [selectedConversation, userId, userRole, addMessage]
  );

  // Check if user can message someone
  const canMessage = useCallback(
    (targetRole: 'director' | 'teacher' | 'parent') => {
      return chatService.canMessage(userRole, targetRole);
    },
    [userRole]
  );

  return {
    conversations,
    selectedConversation,
    messages,
    unreadCount,
    loading,
    sending,
    error,
    selectConversation: handleSelectConversation,
    sendMessage: handleSendMessage,
    canMessage,
  };
};
