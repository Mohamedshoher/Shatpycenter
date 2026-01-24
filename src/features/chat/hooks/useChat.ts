import { useState, useEffect, useCallback } from 'react';
import { useChatStore, ChatMessage, Conversation } from '@/store/useChatStore';
import { chatService } from '@/features/chat/services/chatService';
import { useAuthStore } from '@/store/useAuthStore';

export const useChat = (userId: string, userRole: 'director' | 'teacher' | 'parent') => {
  const { user } = useAuthStore();
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

  // Subscribe to conversations
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = chatService.subscribeToConversations(userId, (data) => {
      setConversations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, setConversations]);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = chatService.subscribeToMessages(selectedConversation.id, (data) => {
      setMessages(data);

      // Mark conversation as read if there are unread messages from others
      const hasUnread = data.some((msg) => !msg.read && msg.senderId !== userId);
      if (hasUnread) {
        chatService.markMessagesAsRead(selectedConversation.id, userId).then(() => {
          markAsRead(selectedConversation.id);
        });
      }
    });

    return () => unsubscribe();
  }, [selectedConversation?.id, setMessages, markAsRead, userId]);

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
      if (!selectedConversation || !content.trim() || !userId) return;

      const tempId = `temp-${Date.now()}`;
      const tempMessage: ChatMessage = {
        id: tempId,
        conversationId: selectedConversation.id,
        senderId: userId,
        senderName: user?.displayName || 'أنت',
        senderRole: userRole,
        content: content.trim(),
        timestamp: new Date(),
        read: true,
        isPinned: false
      };

      // Optimistic update
      setMessages([...messages, tempMessage]);

      try {
        await chatService.sendMessage(
          selectedConversation.id,
          userId,
          user?.displayName || 'أنت',
          userRole,
          content
        );
        // The real-time subscription will replace the temp message with the real one
      } catch (err) {
        // Rollback on error
        setMessages(messages.filter(m => m.id !== tempId));
        setError('خطأ في إرسال الرسالة');
      }
    },
    [selectedConversation, userId, userRole, user?.displayName, messages, setMessages]
  );

  // Toggle Pin
  const togglePinMessage = useCallback(
    async (messageId: string, currentPinStatus: boolean) => {
      try {
        await chatService.togglePinMessage(messageId, !currentPinStatus);
      } catch (err) {
        console.error('Pinning error:', err);
        setError('خطأ في تثبيت الرسالة - تأكد من إضافة عمود is_pinned لجدول messages في Supabase');
      }
    },
    []
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
    togglePinMessage,
    canMessage,
  };
};
