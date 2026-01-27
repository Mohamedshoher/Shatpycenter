'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { updateUserPresence } from '../services/presenceService';
import { useAuthStore } from '@/store/useAuthStore';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
}) => {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    if (message.trim().length > 0 && !isTyping) {
      setIsTyping(true);
      updateUserPresence(user.uid, true);
    } else if (message.trim().length === 0 && isTyping) {
      setIsTyping(false);
      updateUserPresence(user.uid, false);
    }

    // Reset typing after a timeout of no input
    const timeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateUserPresence(user.uid || '', false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [message, user?.uid, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      if (user?.uid) {
        setIsTyping(false);
        updateUserPresence(user.uid, false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 md:p-4 bg-white">
      <div className="flex items-end gap-2 max-w-5xl mx-auto">
        <div className="flex-1 relative group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            disabled={disabled}
            className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-bold text-sm text-right disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="w-12 h-12 md:w-[52px] md:h-[52px] bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100 transition-all flex items-center justify-center shadow-lg shadow-blue-200 disabled:shadow-none shrink-0"
        >
          <Send className="w-5 h-5 -rotate-180" />
        </button>
      </div>
    </form>
  );
};
