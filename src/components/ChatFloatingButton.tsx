'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';

export const ChatFloatingButton: React.FC = () => {
  const { unreadCount } = useChatStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!isVisible) return null;

  return (
    <Link
      href="/chat"
      className="fixed bottom-24 md:bottom-10 left-4 md:left-10 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-xl md:shadow-2xl hover:shadow-2xl md:hover:shadow-3xl transition-all hover:scale-110 z-50 bounce-animation"
    >
      <div className="relative">
        <MessageCircle className="w-7 h-7 md:w-10 md:h-10" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm font-bold text-white bg-red-500 rounded-full animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
};
