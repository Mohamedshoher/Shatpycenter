import { useState, useEffect, useCallback } from 'react';
import { useChatStore, ChatMessage, Conversation } from '@/store/useChatStore';
import { chatService } from '@/features/chat/services/chatService';
import { useAuthStore } from '@/store/useAuthStore';

export const useChat = (userId: string, userRole: 'director' | 'teacher' | 'parent') => {
  const { user } = useAuthStore();
  const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
  const cleanedUserId = cleanId(userId);

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
    updateMessage,
    markAsRead,
    setUnreadCount,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize user
  useEffect(() => {
    setUserId(cleanedUserId);
    setUserRole(userRole);
  }, [cleanedUserId, userRole, setUserId, setUserRole]);

  // Subscribe to conversations
  useEffect(() => {
    if (!cleanedUserId) return;

    setLoading(true);
    const unsubscribe = chatService.subscribeToConversations(cleanedUserId, (data) => {
      setConversations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cleanedUserId, setConversations]);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = chatService.subscribeToMessages(selectedConversation.id, (data) => {
      setMessages(data);

      // تصفير العداد فوراً وبشكل قسري طالما المحادثة مفتوحة
      markAsRead(selectedConversation.id);
      chatService.markMessagesAsRead(selectedConversation.id, cleanedUserId);
    });

    return () => unsubscribe();
  }, [selectedConversation?.id, setMessages, markAsRead, cleanedUserId]);

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
      if (!selectedConversation || !content.trim() || !cleanedUserId) return;

      const tempId = `temp-${Date.now()}`;
      const tempMessage: ChatMessage = {
        id: tempId,
        conversationId: selectedConversation.id,
        senderId: cleanedUserId,
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
          cleanedUserId,
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
    [selectedConversation, cleanedUserId, userRole, user?.displayName, messages, setMessages]
  );

  // Toggle Pin
  const togglePinMessage = useCallback(
    async (messageId: string, currentPinStatus: boolean) => {
      if (!selectedConversation) return;

      const newStatus = !currentPinStatus;

      // التحديث المتفائل (اللحظي) في الواجهة المحلية
      updateMessage(messageId, { isPinned: newStatus });

      try {
        await chatService.togglePinMessage(selectedConversation.id, messageId, newStatus);
      } catch (err) {
        console.error('Pinning error:', err);
        // التراجع في حالة الفشل
        updateMessage(messageId, { isPinned: currentPinStatus });
        setError('خطأ في تثبيت الرسالة');
      }
    },
    [selectedConversation, updateMessage]
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
    cleanedUserId, // تصدير المعرف المنظف للاستخدام في المكونات
  };
};
