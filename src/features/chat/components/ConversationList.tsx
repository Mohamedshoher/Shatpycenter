'use client';

import { Conversation } from '@/store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MessageCircle, Badge } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '@/features/students/hooks/useStudents';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
}) => {
  const { user } = useAuthStore();
  const { data: students } = useStudents();

  const getOtherName = (conversation: Conversation) => {
    if (!user) return 'محادثة';
    const clean = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';
    const myId = clean(user.uid || '');
    const myAltId = user.teacherId ? clean(user.teacherId) : '';
    const myName = (user.displayName || '').trim();

    // 1. محاولة استبعاد معرف المستخدم الحالي
    let otherIndex = conversation.participantIds.findIndex(id => {
      const cid = clean(id);
      return cid !== myId && cid !== myAltId;
    });

    // 2. إذا لم ينجح المعرف، نستبعد بالاسم
    if (otherIndex === -1) {
      otherIndex = conversation.participantNames.findIndex(name => name.trim() !== myName);
    }

    // 3. خيار أخير: إذا كان هناك شخصان، نأخذ الشخص الذي ليس في الترتيب الأول إذا كان الأول هو أنا
    if (otherIndex === -1 && conversation.participantIds.length > 1) {
      otherIndex = clean(conversation.participantIds[0]) === myId ? 1 : 0;
    }

    const finalIdx = otherIndex !== -1 ? otherIndex : 0;
    const originalName = conversation.participantNames[finalIdx] || 'محادثة';

    // تحسين العرض في حالة كان الاسم رقم هاتف (لأولياء الأمور) أو إذا كان الاسم هو نفسه المعرف
    const otherId = clean(conversation.participantIds[finalIdx]);
    const isPhoneNumber = originalName.match(/^[0-9+]+$/);

    if (isPhoneNumber || originalName === otherId) {
      const parentStudents = (students || []).filter(s => s.parentPhone === otherId || s.parentPhone === originalName);
      if (parentStudents.length > 0) {
        return `ولي أمر ${parentStudents.map(s => s.fullName.split(' ')[0]).join(' و ')}`;
      }
    }

    return originalName;
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-bold">لا توجد محادثات نشطة</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {conversations.map((conversation) => {
        const otherName = getOtherName(conversation);
        const initials = otherName.split(' ').map(n => n[0]).join('').slice(0, 2);
        const isSelected = selectedId === conversation.id;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full p-4 flex items-center gap-4 transition-all duration-200 relative group ${isSelected
                ? 'bg-blue-50/50'
                : 'hover:bg-gray-50'
              }`}
          >
            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-full" />
            )}

            {/* Avatar */}
            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-transform group-active:scale-95 ${isSelected
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
              }`}>
              {initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className={`font-black truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'} text-sm`}>
                  {otherName}
                </h3>
                <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                    locale: ar,
                    addSuffix: false,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs truncate ${isSelected ? 'text-blue-700/70' : 'text-gray-500'} font-medium`}>
                  {conversation.lastMessage || 'ابدأ المحادثة الآن...'}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-red-500 rounded-full shadow-sm animate-in zoom-in scale-110">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
