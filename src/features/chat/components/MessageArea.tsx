'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useUserPresence } from '@/features/chat/hooks/useUserPresence';
import { ChatHeader } from './ChatHeader';
import { cleanId, getOtherParticipantId } from './chat-helpers';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '@/store/useChatStore';

interface MessageAreaProps {
  conversation: any;
  messages: ChatMessage[];
  currentUserId: string;
  onTogglePin?: (id: string, status: boolean) => void;
}

export const MessageArea = ({ 
  conversation, 
  messages, 
  currentUserId, 
  onTogglePin 
}: MessageAreaProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لآخر رسالة
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 1. تحديد معرف الشخص الآخر (المدرس/ولي الأمر)
  const otherUserId = useMemo(() => {
    if (!conversation) return null;
    return getOtherParticipantId(conversation.participantIds, currentUserId);
  }, [conversation, currentUserId]);

  // 2. جلب حالة الشخص الآخر (IsOnline, LastSeen) من الـ Hook
  const { isOnline, isTyping, lastSeen } = useUserPresence(otherUserId);

  // 3. تحديد الاسم للعرض
  const otherName = useMemo(() => {
    if (!conversation || !otherUserId) return 'محادثة';
    const idx = conversation.participantIds.indexOf(otherUserId);
    // إذا لم يجد الفهرس بالمعرف المباشر، نجرب بالمعرف المنظف
    if (idx === -1) {
        const cleanedOtherId = cleanId(otherUserId);
        const altIdx = conversation.participantIds.findIndex((id: string) => cleanId(id) === cleanedOtherId);
        return conversation.participantNames[altIdx !== -1 ? altIdx : 0] || 'مستخدِم';
    }
    return conversation.participantNames[idx] || 'مستخدم';
  }, [conversation, otherUserId]);

  if (!conversation) return (
    <div className="flex-1 flex flex-col items-center justify-center opacity-40">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">💬</span>
      </div>
      <p className="text-xs font-bold text-gray-400">اختر محادثة لبدء المراسلة</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative">
      {/* استدعاء الهيدر الجديد */}
      <ChatHeader 
        name={otherName} 
        isOnline={isOnline} 
        isTyping={isTyping} 
        lastSeen={lastSeen} 
      />

      {/* منطقة الرسائل - نستخدم فيها مكون MessageBubble مع خاصية التمرير */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[#F8F9FA]/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <p className="text-xs font-bold text-gray-400">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isCurrentUser={cleanId(msg.senderId) === cleanId(currentUserId)}
              onTogglePin={onTogglePin}
            />
          ))
        )}
      </div>
    </div>
  );
};