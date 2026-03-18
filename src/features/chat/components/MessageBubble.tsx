import { cn } from '@/lib/utils';
import { ChatMessage } from '@/store/useChatStore';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AlertTriangle, Pin } from 'lucide-react';
import React from 'react';

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onTogglePin?: (id: string, status: boolean) => void;
}

// استخدام React.memo لمنع إعادة الرندرة غير الضرورية
export const MessageBubble = React.memo(({ message, isCurrentUser, onTogglePin }: MessageBubbleProps) => {
  // تحديد نوع الرسالة (تنبيه، مكافأة، عادية)
  const isSystemAlert = message.content.match(/⚠️|تنبيه إداري|أتمتة|خصم|غياب/);
  const isRewardAlert = message.content.match(/🌟|مكافأة|تميز/);

  return (
    <div className={cn("flex group", isCurrentUser ? "justify-start" : "justify-end")}>
      <div className={cn(
        "max-w-[85%] lg:max-w-md px-4 py-2.5 rounded-[22px] relative transition-all shadow-sm",
        isSystemAlert ? "bg-red-50 text-red-900 border border-red-200 ring-2 ring-red-100" :
        isRewardAlert ? "bg-emerald-50 text-emerald-900 border border-emerald-200 ring-2 ring-emerald-100" :
        isCurrentUser ? "bg-blue-600 text-white rounded-tr-none" : "bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none",
        message.isPinned && "ring-2 ring-blue-400 ring-offset-2"
      )}>
        {/* أيقونة التثبيت العلوية */}
        {message.isPinned && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg rotate-12">
            <Pin size={10} className="fill-current" />
          </div>
        )}

        {/* محتوى الرسالة */}
        <p className="text-[13px] break-words leading-relaxed font-bold tracking-tight">
          {message.content}
        </p>

        {/* الوقت وحالة القراءة */}
        <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
          <p className="text-[9px] font-bold">
            {format(new Date(message.timestamp), 'h:mm a', { locale: ar })}
          </p>
          {isCurrentUser && (
            <span className={cn("inline-flex", message.read ? "text-teal-400" : "text-gray-400")}>
               <CheckIcon isRead={message.read} />
            </span>
          )}
        </div>

        {/* زر التثبيت عند الحوم (Hover) - يظهر فقط للرسائل المؤكدة في قاعدة البيانات */}
        {!message.id.startsWith('temp-') && (
          <button
            onClick={() => onTogglePin?.(message.id, !!message.isPinned)}
            className={cn(
              "absolute top-1 w-7 h-7 rounded-full bg-white shadow-lg border flex items-center justify-center transition-all",
              isCurrentUser ? "-left-9" : "-right-9",
              message.isPinned ? "opacity-100 scale-110 text-blue-600" : "opacity-0 group-hover:opacity-100 text-gray-300"
            )}
          >
            <Pin size={12} className={message.isPinned ? "fill-blue-600" : ""} />
          </button>
        )}
      </div>
    </div>
  );
});

const CheckIcon = ({ isRead }: { isRead?: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
    {isRead && <polyline points="15 6 9 12 4 7" style={{ transform: 'translateX(4px)' }} />}
  </svg>
);