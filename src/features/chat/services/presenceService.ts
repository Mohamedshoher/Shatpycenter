import { supabase } from '@/lib/supabase';

// ✨ وظيفة لجلب آخر نشاط فعلي للمستخدم من الجداول المختلفة
export const getUserPresence = async (userId: string): Promise<{ lastSeen: Date; isOnline: boolean } | null> => {
    const cleanId = userId.replace('mock-', '');
    
    try {
        // 1. فحص آخر رسالة أرسلها
        const { data: lastMessage } = await supabase
            .from('messages')
            .select('created_at')
            .eq('sender_id', cleanId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. فحص آخر تسجيل حضور للمعلم نفسه
        const { data: lastAttendance } = await supabase
            .from('teacher_attendance')
            .select('created_at')
            .eq('teacher_id', cleanId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let latestDate: Date | null = null;
        
        if (lastMessage?.created_at) {
            latestDate = new Date(lastMessage.created_at);
        }
        
        if (lastAttendance?.created_at) {
            const attDate = new Date(lastAttendance.created_at);
            if (!latestDate || attDate > latestDate) {
                latestDate = attDate;
            }
        }

        if (!latestDate) return null;

        // تحديد الحالة (متصل إذا كان آخر نشاط خلال الـ 10 دقائق الماضية)
        const isOnline = (new Date().getTime() - latestDate.getTime()) < 10 * 60000;

        return { lastSeen: latestDate, isOnline };
    } catch (error) {
        console.error('Error fetching real activity presence:', error);
        return null;
    }
};

// ✨ الاستماع لحالة المستخدم (محاكاة باستخدام الطلب المباشر لتقليل الأخطاء)
export const subscribeToUserPresence = (
    userId: string,
    callback: (presence: { lastSeen: Date; isOnline: boolean; isTyping?: boolean }) => void
): (() => void) => {
    const fetchAndNotify = async () => {
        const presence = await getUserPresence(userId);
        if (presence) {
            callback(presence);
        }
    };

    fetchAndNotify();
    const interval = setInterval(fetchAndNotify, 30000); // تحديث كل 30 ثانية

    return () => clearInterval(interval);
};

// وظائف فارغة للتوافق مع المكونات الحالية دون أخطاء
export const updateUserPresence = async (userId: string, isTyping: boolean = false): Promise<void> => {};
export const setUserOffline = async (userId: string): Promise<void> => {};

// ✨ تنسيق آخر ظهور بالعربية
export const formatLastSeen = (lastSeen: Date | string | null, isOnline?: boolean): string => {
    if (!lastSeen) return 'غير متوفر';
    if (isOnline) return 'متصل الآن';

    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'نشط قبل قليل';
    if (diffMins < 60) return `نشط منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `نشط منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'نشط بالأمس';

    return `آخر نشاط ${date.toLocaleDateString('ar-EG')}`;
};
