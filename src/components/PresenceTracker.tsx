'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { updateUserPresence, setUserOffline } from '@/features/chat/services/presenceService';

// ✨ مكون لتتبع آخر ظهور المستخدم تلقائياً
export const PresenceTracker: React.FC = () => {
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.uid) return;

        // تحديث الحالة عند التحميل
        updateUserPresence(user.uid);

        // تحديث الحالة كل 30 ثانية
        const interval = setInterval(() => {
            updateUserPresence(user.uid);
        }, 30000);

        // تحديث الحالة عند النشاط
        const handleActivity = () => {
            updateUserPresence(user.uid);
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        // تحديث الحالة إلى غير متصل عند الخروج
        const handleBeforeUnload = () => {
            setUserOffline(user.uid);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // تحديث الحالة إلى غير متصل عند إلغاء التثبيت
            setUserOffline(user.uid);
        };
    }, [user?.uid]);

    return null;
};
