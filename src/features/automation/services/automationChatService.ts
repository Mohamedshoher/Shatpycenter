import { ChatMessage, Conversation } from '@/store/useChatStore';

// Integration service between Automation and Chat systems
export const automationChatService = {
  // Send automation notification to chat
  sendNotificationToChat: async (
    teacherId: string,
    teacherName: string,
    directorId: string,
    message: string
  ): Promise<ChatMessage[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const messages: ChatMessage[] = [];

        // Message 1: To the teacher
        const teacherMessage: ChatMessage = {
          id: `auto-msg-${Date.now()}-teacher`,
          conversationId: `conv-teacher-${teacherId}`,
          senderId: 'system-automation',
          senderName: 'نظام الأتمتة',
          senderRole: 'director',
          content: message,
          timestamp: new Date(),
          read: false,
        };
        messages.push(teacherMessage);

        // Message 2: To the director
        const directorMessage: ChatMessage = {
          id: `auto-msg-${Date.now()}-director`,
          conversationId: `conv-director-${directorId}`,
          senderId: 'system-automation',
          senderName: 'نظام الأتمتة',
          senderRole: 'director',
          content: `✅ تم تطبيق الخصم على ${teacherName}. ${message}`,
          timestamp: new Date(),
          read: false,
        };
        messages.push(directorMessage);

        resolve(messages);
      }, 300);
    });
  },

  // Get automation notifications for a user
  getAutomationNotifications: async (userId: string): Promise<ChatMessage[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock notifications
        const notifications: ChatMessage[] = [
          {
            id: 'notif-1',
            conversationId: 'conv-system',
            senderId: 'system-automation',
            senderName: 'نظام الأتمتة',
            senderRole: 'director',
            content: 'تم خصم ربع يوم من راتبك لعدم تسليم التقرير اليومي',
            timestamp: new Date(Date.now() - 60000),
            read: false,
          },
        ];
        resolve(notifications);
      }, 300);
    });
  },

  // Mark automation notification as read
  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 200);
    });
  },
};
