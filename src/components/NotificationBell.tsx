"use client";

import { useState, useRef, useEffect } from 'react';
import Bell from 'lucide-react/dist/esm/icons/bell'
import X from 'lucide-react/dist/esm/icons/x'
import Check from 'lucide-react/dist/esm/icons/check'
import CheckCheck from 'lucide-react/dist/esm/icons/check-check'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useClearAllNotifications } from '@/features/notifications/hooks/useNotifications';
import { AppNotification } from '@/types';

export default function NotificationBell() {
    const { user } = useAuthStore();
    const teacherId = user?.teacherId;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: notifications = [] } = useNotifications(teacherId);
    const unreadCount = useUnreadCount(teacherId);
    const markAsReadMutation = useMarkAsRead();
    const markAllAsReadMutation = useMarkAllAsRead(teacherId);
    const deleteNotificationMutation = useDeleteNotification();
    const clearAllMutation = useClearAllNotifications(teacherId);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = (id: string) => {
        markAsReadMutation.mutate(id);
    };

    const handleMarkAllAsRead = () => {
        markAllAsReadMutation.mutate();
    };

    const handleDeleteNotification = (id: string) => {
        deleteNotificationMutation.mutate(id);
    };

    const handleClearAll = () => {
        if (confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
            clearAllMutation.mutate();
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'deduction': return { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'خصم' };
            case 'reward': return { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'مكافأة' };
            default: return { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'النظام' };
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 relative hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed md:absolute top-16 md:top-full left-1/2 -translate-x-1/2 mt-0 md:mt-2 w-[380px] max-w-[95vw] bg-white border border-gray-100 rounded-3xl shadow-2xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                        <h3 className="text-sm font-black text-gray-900">الإشعارات</h3>
                        <div className="flex items-center gap-2">
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    حذف الكل
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <CheckCheck size={14} />
                                    تحديد الكل مقروء
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات</p>
                            </div>
                        ) : (
                            notifications.map((notif: AppNotification) => {
                                const styles = getTypeStyles(notif.type);
                                return (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors relative group",
                                            !notif.isRead && "bg-blue-50/20"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", styles.dot)} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full", styles.bg, styles.text)}>
                                                        {styles.label}
                                                    </span>
                                                    {!notif.isRead && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    )}
                                                </div>

                                                <p className={cn(
                                                    "text-xs leading-relaxed",
                                                    notif.isRead ? "text-gray-500" : "text-gray-800 font-medium"
                                                )}>
                                                    {notif.message}
                                                </p>

                                                {notif.reason && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                                        {notif.reason}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between mt-1.5">
                                                    <span className="text-[9px] text-gray-400">
                                                        {new Date(notif.createdAt).toLocaleDateString('ar-EG', {
                                                            day: 'numeric', month: 'short',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleDeleteNotification(notif.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 font-bold flex items-center gap-0.5 transition-opacity"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        {!notif.isRead && (
                                                            <button
                                                                onClick={() => handleMarkAsRead(notif.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 transition-opacity"
                                                            >
                                                                <Check size={12} />
                                                                تم القراءة
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
