'use client';

import { Conversation } from '@/store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MessageCircle, Badge } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

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

  const getOtherName = (conversation: Conversation) => {
    if (!user) return 'محادثة';
    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const currentCleanId = cleanId(user.uid || '');

    // البحث عن المشارك الآخر
    const otherIndex = conversation.participantIds.findIndex(id => cleanId(id) !== currentCleanId);

    // إذا وجدنا مشاركاً آخر، نأخذ اسمه، وإلا نأخذ المشارك الثاني افتراضياً
    const finalIndex = otherIndex !== -1 ? otherIndex : (conversation.participantIds.length > 1 ? 1 : 0);
    return conversation.participantNames[finalIndex] || 'محادثة';
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
