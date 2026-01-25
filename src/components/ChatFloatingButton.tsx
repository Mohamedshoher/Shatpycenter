'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';
import { playNotificationSound } from '@/lib/notificationSound';
import { useAuthStore } from '@/store/useAuthStore';
import { chatService } from '@/features/chat/services/chatService';

export const ChatFloatingButton: React.FC = () => {
  const { user } = useAuthStore();
  const { unreadCount, setConversations } = useChatStore();
  const [isVisible, setIsVisible] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const prevUnreadCount = useRef(0);

  // ✨ الاستماع المباشر للمحادثات لتحديث العداد فوراً
  useEffect(() => {
    if (!user?.uid) return;

    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const userId = cleanId(user.uid);

    // الاشتراك في المحادثات
    const unsubscribe = chatService.subscribeToConversations(userId, (conversations) => {
      setConversations(conversations);
    });

    return () => unsubscribe();
  }, [user?.uid, setConversations]);

  // ✨ تشغيل صوت فوري عند زيادة العداد
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      // ⚡ تشغيل الصوت فوراً
      playNotificationSound();

      // 🎯 تأثير بصري فوري
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 2000);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!isVisible) return null;

  return (
    <Link
      href="/chat"
      className={`fixed bottom-24 md:bottom-10 left-4 md:left-10 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-xl md:shadow-2xl hover:shadow-2xl md:hover:shadow-3xl transition-all hover:scale-110 z-50 ${showPulse ? 'animate-bounce' : ''
        }`}
    >
      <div className="relative">
        <MessageCircle className="w-7 h-7 md:w-10 md:h-10" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 flex items-center justify-center min-w-6 h-6 md:min-w-7 md:h-7 px-1.5 text-xs md:text-sm font-black text-white bg-red-500 rounded-full shadow-lg ${showPulse ? 'animate-ping' : 'animate-pulse'
              }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
};
