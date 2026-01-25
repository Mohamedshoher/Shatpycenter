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
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">لا توجد محادثات</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={`w-full p-4 text-right transition-colors ${selectedId === conversation.id
            ? 'bg-blue-50 border-r-4 border-blue-500'
            : 'hover:bg-gray-50'
            }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  {getOtherName(conversation)}
                </h3>
                {conversation.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">
                {conversation.lastMessage}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                  locale: ar,
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
