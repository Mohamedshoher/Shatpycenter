import { useState, useEffect } from 'react';
import {
    getUserPresence,
    subscribeToUserPresence,
    formatLastSeen
} from '../services/presenceService';

export const useUserPresence = (userId: string | null) => {
    const [lastSeen, setLastSeen] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [formattedLastSeen, setFormattedLastSeen] = useState('غير متصل');

    useEffect(() => {
        if (!userId) return;

        // الاشتراك في حالة المستخدم
        const unsubscribe = subscribeToUserPresence(userId, (presence) => {
            setLastSeen(presence.lastSeen);
            setIsOnline(presence.isOnline);
            setIsTyping(presence.isTyping || false);
            setFormattedLastSeen(formatLastSeen(presence.lastSeen, presence.isOnline));
        });

        return () => unsubscribe();
    }, [userId]);

    // تحديث النص كل دقيقة
    useEffect(() => {
        if (!lastSeen) return;

        const interval = setInterval(() => {
            setFormattedLastSeen(formatLastSeen(lastSeen, isOnline));
        }, 60000); // كل دقيقة

        return () => clearInterval(interval);
    }, [lastSeen, isOnline]);

    return {
        lastSeen,
        isOnline,
        isTyping,
        formattedLastSeen,
    };
};
