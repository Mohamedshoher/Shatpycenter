"use client";

import { useAuthStore } from '@/store/useAuthStore';
import MessagingApp from '@/features/messaging/components/MessagingApp';

export default function ParentMessagesPage() {
    const { user } = useAuthStore();
    if (!user) return null;
    return <MessagingApp user={user} backHref="/parent" />;
}
