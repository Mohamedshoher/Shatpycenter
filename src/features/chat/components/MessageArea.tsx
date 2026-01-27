'use client';

import { ChatMessage, Conversation } from '@/store/useChatStore';
import { useEffect, useRef, useMemo, useState } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Pin, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useUserPresence } from '@/features/chat/hooks/useUserPresence';

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
  const { data: students } = useStudents();
  const [activePinnedIndex, setActivePinnedIndex] = useState(0);
  const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
  const cleanedCurrentUserId = cleanId(currentUserId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);

  // ✨ الحصول على معرف الطرف الآخر
  const otherUserId = useMemo(() => {
    if (!conversation) return null;
    const clean = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';
    const myId = clean(currentUserId);

    const otherIndex = conversation.participantIds.findIndex(id => clean(id) !== myId);
    return otherIndex !== -1 ? conversation.participantIds[otherIndex] : null;
  }, [conversation, currentUserId]);

  // ✨ استخدام hook لآخر ظهور وحالة الكتابة
  const { formattedLastSeen, isOnline, isTyping } = useUserPresence(otherUserId);

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`msg-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a subtle highlight effect
      element.classList.add('ring-4', 'ring-blue-500/20', 'rounded-3xl', 'transition-all');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500/20');
      }, 2000);
    }
  };

  useEffect(() => {
    if (pinnedMessages.length > 0 && activePinnedIndex >= pinnedMessages.length) {
      setActivePinnedIndex(pinnedMessages.length - 1);
    }
  }, [pinnedMessages.length, activePinnedIndex]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>اختر محادثة للبدء</p>
      </div>
    );
  }

  const otherName = useMemo(() => {
    if (!conversation) return 'محادثة';
    const clean = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';
    const myId = clean(currentUserId);

    let idx = conversation.participantIds.findIndex(id => clean(id) !== myId);

    // Fallback logic
    if (idx === -1) idx = 0;

    const originalName = conversation.participantNames[idx] || 'محادثة';
    const otherId = clean(conversation.participantIds[idx]);

    // تحسين العرض في حالة كان الاسم رقم هاتف (لأولياء الأمور)
    const isPhoneNumber = originalName.match(/^[0-9+]+$/);

    if (isPhoneNumber || originalName === otherId) {
      const parentStudents = (students || []).filter(s => s.parentPhone === otherId || s.parentPhone === originalName);
      if (parentStudents.length > 0) {
        return `ولي أمر ${parentStudents.map(s => s.fullName).join(' و ')}`;
      }
    }

    return originalName;
  }, [conversation, currentUserId, students]);

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative">
      {showHeader && (
        <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg font-semibold text-gray-900 text-right font-black">
            {otherName}
          </h2>
          <div className="flex items-center gap-2 justify-end">
            {isOnline && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            )}
            <p className={cn(
              "text-[10px] font-bold text-right transition-colors",
              isTyping ? "text-blue-500" : "text-gray-500"
            )}>
              {isTyping ? 'يكتب الآن...' : formattedLastSeen}
            </p>
          </div>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="bg-blue-50/90 backdrop-blur-md border-b border-blue-100 p-2 flex items-center justify-between gap-3 px-4 z-20 sticky top-0 shadow-sm transition-all duration-300">
          <div
            className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group/pin"
            onClick={() => scrollToMessage(pinnedMessages[activePinnedIndex].id)}
          >
            <div className="w-1.5 h-8 bg-blue-500 rounded-full shrink-0" />
            <div className="overflow-hidden text-right">
              <p className="text-[10px] font-black text-blue-600 mb-0.5 flex items-center gap-1.5">
                <Pin size={10} className="rotate-45" />
                رسالة مثبتة ({activePinnedIndex + 1} من {pinnedMessages.length})
              </p>
              <p className="text-xs text-blue-900 font-bold truncate tracking-tight group-hover/pin:text-blue-600 transition-colors">
                {pinnedMessages[activePinnedIndex].content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/50 p-1 rounded-xl">
            {pinnedMessages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePinnedIndex(prev => (prev > 0 ? prev - 1 : pinnedMessages.length - 1));
                  }}
                  className="w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePinnedIndex(prev => (prev < pinnedMessages.length - 1 ? prev + 1 : 0));
                  }}
                  className="w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
              </>
            )}
            <div className="w-px h-4 bg-blue-100 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(pinnedMessages[activePinnedIndex].id, true);
              }}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="إلغاء التثبيت"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="font-bold">لا توجد رسائل حتى الآن</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = cleanId(message.senderId) === cleanedCurrentUserId;
            const isSystemAlert = message.content.includes('⚠️ تنبيه إداري');
            const isRewardAlert = message.content.includes('🌟 مكافأة إدارية');

            // حساب ما إذا كانت الرسالة في يوم جديد لإرسال فاصل
            const showDateSeparator = index === 0 || !isSameDay(new Date(message.timestamp), new Date(messages[index - 1].timestamp));

            const getSeparatorDate = (date: Date) => {
              if (isToday(date)) return 'اليوم';
              if (isYesterday(date)) return 'أمس';
              return format(date, 'eeee, d MMMM yyyy', { locale: ar });
            };

            return (
              <div key={message.id} id={`msg-${message.id}`} className="flex flex-col gap-4 scroll-mt-24 transition-all duration-500">
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {getSeparatorDate(new Date(message.timestamp))}
                    </div>
                  </div>
                )}

                <div className={cn("flex group", isCurrentUser ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] lg:max-w-md px-4 py-2.5 rounded-[22px] relative transition-all duration-200 shadow-sm",
                      isSystemAlert
                        ? "bg-red-50 text-red-900 border border-red-200 rounded-tr-none rounded-tl-none ring-2 ring-red-100"
                        : isRewardAlert
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tr-none rounded-tl-none ring-2 ring-emerald-100"
                          : isCurrentUser
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-900 rounded-tl-none",
                      message.isPinned && "ring-2 ring-blue-400 ring-offset-2"
                    )}
                  >
                    {(isSystemAlert || isRewardAlert) && (
                      <div className={cn(
                        "mb-2 flex items-center gap-2 border-b pb-2",
                        isSystemAlert ? "text-red-600 border-red-200" : "text-emerald-600 border-emerald-200"
                      )}>
                        <AlertTriangle size={16} fill="currentColor" className={isSystemAlert ? "text-red-100" : "text-emerald-100"} />
                        <span className={cn("text-xs font-black", isSystemAlert ? "text-red-700" : "text-emerald-700")}>
                          {isSystemAlert ? 'تنبيه إداري' : 'مكافأة تشجيعية'}
                        </span>
                      </div>
                    )}

                    {message.isPinned && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                        <Pin size={10} className="fill-current" />
                      </div>
                    )}

                    <p className={cn("text-[13px] break-words leading-relaxed font-bold tracking-tight", isSystemAlert && "text-red-900")}>{message.content}</p>

                    <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                      <p className="text-[9px] font-bold">
                        {format(new Date(message.timestamp), 'h:mm a', { locale: ar })}
                      </p>
                      {isCurrentUser && (
                        <span className={cn("inline-flex", message.read ? "text-teal-400" : "text-gray-400")}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                            {message.read && <polyline points="15 6 9 12 4 7" style={{ transform: 'translateX(4px)' }}></polyline>}
                          </svg>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin?.(message.id, !!message.isPinned);
                      }}
                      className={cn(
                        "absolute top-1 w-7 h-7 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center transition-all",
                        isCurrentUser ? "-left-9" : "-right-9",
                        message.isPinned ? "text-blue-600 opacity-100 scale-110" : "text-gray-300 opacity-0 group-hover:opacity-100 md:opacity-0 active:opacity-100 translate-y-1 group-hover:translate-y-0"
                      )}
                      title={message.isPinned ? "إلغاء التثبيت" : "تثبيت الرسالة"}
                    >
                      <Pin size={12} className={message.isPinned ? "fill-blue-600" : ""} />
                    </button>
                  </div>
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
