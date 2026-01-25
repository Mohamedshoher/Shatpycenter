'use client';

import { ChatMessage, Conversation } from '@/store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useEffect, useRef } from 'react';
import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageAreaProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  currentUserId: string;
  showHeader?: boolean;
  onTogglePin?: (id: string, status: boolean) => void;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
  conversation,
  messages,
  currentUserId,
  showHeader = true,
  onTogglePin,
}) => {
  const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
  const cleanedCurrentUserId = cleanId(currentUserId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pinnedMessages = messages.filter(m => m.isPinned);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>اختر محادثة للبدء</p>
      </div>
    );
  }

  const currentCleanId = cleanId(currentUserId);
  const otherIndex = conversation.participantIds.findIndex(id => cleanId(id) !== currentCleanId);
  const otherName = conversation.participantNames[otherIndex === -1 ? 1 : otherIndex] || 'محادثة';

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative">
      {showHeader && (
        <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg font-semibold text-gray-900 text-right font-black">
            {otherName}
          </h2>
          <p className="text-[10px] text-gray-500 text-right font-bold">
            {conversation.participantNames.length} مشاركين
          </p>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="bg-blue-50/80 backdrop-blur-sm border-b border-blue-100 p-2 flex items-center justify-between gap-3 px-4 z-10 sticky top-0 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
            <div className="overflow-hidden text-right">
              <p className="text-[9px] font-black text-blue-600 mb-0.5">رسالة مثبتة</p>
              <p className="text-xs text-blue-900 font-bold truncate tracking-tight">{pinnedMessages[pinnedMessages.length - 1].content}</p>
            </div>
          </div>
          <button
            onClick={() => onTogglePin?.(pinnedMessages[pinnedMessages.length - 1].id, true)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="إلغاء التثبيت"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="font-bold">لا توجد رسائل حتى الآن</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = cleanId(message.senderId) === cleanedCurrentUserId;
            return (
              <div
                key={message.id}
                className={`flex group ${isCurrentUser ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] lg:max-w-md px-4 py-2.5 rounded-[22px] relative transition-all duration-200 ${isCurrentUser
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-gray-100 text-gray-900 rounded-tl-none'
                    } ${message.isPinned ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
                >
                  {!isCurrentUser && (
                    <p className="text-[9px] font-black mb-1 opacity-70">
                      {message.senderName}
                    </p>
                  )}
                  <p className="text-[13px] break-words leading-relaxed font-bold tracking-tight">{message.content}</p>

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                    <p className="text-[9px] font-bold">
                      {formatDistanceToNow(new Date(message.timestamp), {
                        locale: ar,
                        addSuffix: false,
                      })}
                    </p>
                    {isCurrentUser && (
                      <span className={cn("inline-flex", message.read ? "text-teal-400" : "text-gray-400")}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                          {message.read && <polyline points="15 6 9 12 4 7" style={{ transform: 'translateX(4px)' }}></polyline>}
                        </svg>
                      </span>
                    )}
                    {message.isPinned && <Pin size={9} className="fill-current" />}
                  </div>

                  {/* Pin Action Button - Always accessible, hover effects for desktop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin?.(message.id, !!message.isPinned);
                    }}
                    className={cn(
                      "absolute top-1 w-7 h-7 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center transition-all",
                      isCurrentUser ? "-left-9" : "-right-9",
                      message.isPinned
                        ? "text-blue-600 opacity-100 scale-110"
                        : "text-gray-300 opacity-0 group-hover:opacity-100 md:opacity-0 active:opacity-100 translate-y-1 group-hover:translate-y-0"
                    )}
                    style={{
                      // Show slightly on mobile if not pinned to let user know they can pin
                      opacity: !message.isPinned ? undefined : 1
                    }}
                    title={message.isPinned ? "إلغاء التثبيت" : "تثبيت الرسالة"}
                  >
                    <Pin size={12} className={message.isPinned ? "fill-blue-600" : ""} />
                  </button>

                  {/* Mobile Tap Action (Simulated by making message clickable if needed, but for now just desktop hover) */}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
