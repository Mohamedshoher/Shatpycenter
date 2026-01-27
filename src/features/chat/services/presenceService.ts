import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// مخزن مؤقت للحالة في الذاكرة
let globalChannel: RealtimeChannel | null = null;
const presenceSubscribers: Map<string, Set<(presence: { lastSeen: Date; isOnline: boolean; isTyping?: boolean }) => void>> = new Map();
const onlineUsers = new Set<string>();

// ✨ تهيئة نظام التواجد العام
const initGlobalPresence = (myUserId: string) => {
    if (globalChannel) return;

    const cleanMyId = myUserId.replace('mock-', '');

    globalChannel = supabase.channel('global-presence')
        .on('presence', { event: 'sync' }, () => {
            const state = globalChannel?.presenceState() || {};

            // تحديث قائمة المتصلين
            onlineUsers.clear();
            Object.keys(state).forEach(key => {
                onlineUsers.add(key);
            });

            // إشعار جميع المستمعين بالتحديث
            presenceSubscribers.forEach((callbacks, userId) => {
                const presenceForUser = Object.values(state).flat().find((p: any) => p.user_id === userId) as any;
                const isOnline = onlineUsers.has(userId);
                callbacks.forEach(cb => cb({
                    lastSeen: new Date(),
                    isOnline,
                    isTyping: presenceForUser?.is_typing || false
                }));
            });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            onlineUsers.add(key);
            notifySubscribers(key, true);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            onlineUsers.delete(key);
            notifySubscribers(key, false);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // تسجيل المستخدم الحالي كـ "متصل"
                await globalChannel?.track({
                    user_id: cleanMyId,
                    online_at: new Date().toISOString(),
                });
            }
        });
};

const notifySubscribers = (userId: string, isOnline: boolean, isTyping: boolean = false) => {
    const callbacks = presenceSubscribers.get(userId);
    if (callbacks) {
        callbacks.forEach(cb => cb({ lastSeen: new Date(), isOnline, isTyping }));
    }
};

// ✨ تحديث آخر ظهور للمستخدم (track) مع دعم حالة الكتابة
export const updateUserPresence = async (userId: string, isTyping: boolean = false): Promise<void> => {
    const cleanId = userId.replace('mock-', '');
    if (!globalChannel) {
        initGlobalPresence(cleanId);
    } else {
        await globalChannel?.track({
            user_id: cleanId,
            online_at: new Date().toISOString(),
            is_typing: isTyping
        });
    }
};

// ✨ تحديث حالة المستخدم إلى غير متصل
export const setUserOffline = async (userId: string): Promise<void> => {
    if (globalChannel) {
        await globalChannel.untrack();
    }
};

// ✨ الحصول على آخر ظهور للمستخدم
export const getUserPresence = async (userId: string): Promise<{ lastSeen: Date; isOnline: boolean } | null> => {
    const cleanId = userId.replace('mock-', '');
    const isOnline = onlineUsers.has(cleanId);

    // إذا لم يكن متصلاً، نحاول جلبه من قاعدة البيانات كخيار احتياطي (إذا كان الجدول موجوداً)
    if (!isOnline) {
        const { data } = await supabase
            .from('user_presence')
            .select('last_seen')
            .eq('user_id', cleanId)
            .single();

        if (data?.last_seen) {
            return { lastSeen: new Date(data.last_seen), isOnline: false };
        }
    }

    return {
        lastSeen: new Date(), // افتراضي
        isOnline,
    };
};

// ✨ الاستماع لحالة المستخدم في الوقت الفعلي
export const subscribeToUserPresence = (
    userId: string,
    callback: (presence: { lastSeen: Date; isOnline: boolean; isTyping?: boolean }) => void
): (() => void) => {
    const cleanId = userId.replace('mock-', '');

    // التأكد من تهيئة القناة
    if (!globalChannel) {
        // لا يمكننا التهيئة بدون معرف المستخدم الحالي هنا، لكن سيعمل إذا تم استدعاء updateUserPresence مسبقاً
        // سنعتمد على أن التطبيق يستدعي updateUserPresence عند البدء
    }

    // إضافة المستمع
    if (!presenceSubscribers.has(cleanId)) {
        presenceSubscribers.set(cleanId, new Set());
    }
    presenceSubscribers.get(cleanId)?.add(callback);

    // إرسال الحالة الحالية فوراً
    const isOnline = onlineUsers.has(cleanId);
    callback({ lastSeen: new Date(), isOnline });

    return () => {
        const subs = presenceSubscribers.get(cleanId);
        subs?.delete(callback);
        if (subs?.size === 0) {
            presenceSubscribers.delete(cleanId);
        }
    };
};

// ✨ تنسيق آخر ظهور بالعربية
export const formatLastSeen = (lastSeen: Date, isOnline: boolean): string => {
    if (isOnline) return 'متصل الآن';

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'كان متصلاً قبل قليل';
    if (diffMins < 60) return `كان متصلاً منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `كان متصلاً منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'كان متصلاً بالأمس';

    return `آخر ظهور ${lastSeen.toLocaleDateString('ar-EG')}`;
};
