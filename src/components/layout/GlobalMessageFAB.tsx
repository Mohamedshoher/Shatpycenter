"use client";

import { useMessaging } from '@/features/messaging/hooks/useMessaging';
import { useMessagingStore } from '@/features/messaging/store/useMessagingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getMessagingActor } from '@/features/messaging/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';

export default function GlobalMessageFAB() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuthStore();
    const storeActor = useMessagingStore((s) => s.actor);
    const token = useMessagingStore((s) => s.token);
    const actor = storeActor || (user ? getMessagingActor(user) : null);

    const { conversations } = useMessaging(actor && token ? actor : null);

    const unreadCount = useMemo(() => {
        if (!actor) return 0;
        return conversations.reduce((sum, conv) => {
            return sum + (conv.unread_counts?.[actor] || 0);
        }, 0);
    }, [conversations, actor]);

    if (!user) return null;
    if (pathname === '/messages' || pathname === '/parent/messages') return null;

    return (
        <button
            onClick={() => router.push(user.role === 'parent' ? '/parent/messages' : '/messages')}
            className="fixed bottom-[160px] left-6 z-[100] w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-sky-500/40 active:scale-90 transition-transform hover:bg-sky-700"
            title="الرسائل الداخلية"
        >
            <MessageCircle size={26} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm animate-pulse">
                    {unreadCount > 99 ? '+99' : unreadCount}
                </span>
            )}
        </button>
    );
}
