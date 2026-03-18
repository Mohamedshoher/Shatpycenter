import { cn } from '@/lib/utils';
import { formatLastSeen } from './date-formatters';

interface ChatHeaderProps {
  name: string;
  isOnline: boolean;
  isTyping: boolean;
  lastSeen: string | Date | null;
}

export const ChatHeader = ({ name, isOnline, isTyping, lastSeen }: ChatHeaderProps) => {
  return (
    <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col items-end">
      {/* اسم المدرس أو ولي الأمر */}
      <h2 className="text-lg font-black text-gray-900 leading-tight">
        {name}
      </h2>

      <div className="flex items-center gap-2 mt-1">
        <p className={cn(
          "text-[11px] font-bold transition-colors",
          isTyping ? "text-blue-500 animate-pulse" : "text-gray-500"
        )}>
          {isTyping 
            ? 'يكتب الآن...' 
            : isOnline 
              ? 'متصل الآن' 
              : formatLastSeen(lastSeen)
          }
        </p>

        {/* نقطة خضراء تظهر فقط إذا كان متصل */}
        {isOnline && !isTyping && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
          </span>
        )}
      </div>
    </div>
  );
};