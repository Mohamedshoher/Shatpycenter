import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithRole } from '../services/authService';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessagingStore } from '@/features/messaging/store/useMessagingStore';
import { getMessagingActor } from '@/features/messaging/utils';
import { getMessagingToken } from '@/features/messaging/services/messagingService';

/**
 * هوك مخصص (Custom Hook) لإدارة عملية تسجيل الدخول
 * يقوم بالتعامل مع حالات التحميل، الأخطاء، وتوجيه المستخدم بعد النجاح
 */
export const useLogin = () => {
    // --- حالات الواجهة المحلية (Local State) ---
    const [loading, setLoading] = useState(false); // حالة التحميل (لإظهار مؤشر الانتظار)
    const [error, setError] = useState<string | null>(null); // حالة الخطأ لتخزين رسائل الخطأ

    // --- الأدوات والمتجر العالمي (Store & Tools) ---
    const setUser = useAuthStore((state) => state.setUser); // دالة حفظ بيانات المستخدم في المتجر (Zustand)
    const router = useRouter(); // أداة التنقل بين الصفحات في Next.js

    /**
     * الدالة الرئيسية لتنفيذ عملية تسجيل الدخول
     * @param role - المعرف الخاص بالدور (مثلاً: director, teacher, parent-phone)
     * @param pass - كلمة المرور
     */
    const login = async (role: string, pass: string) => {
        setLoading(true);   // البدء في عملية التحميل
        setError(null);     // تصفير أي أخطاء سابقة
        
        try {
            // 1. محاولة تسجيل الدخول عبر الخدمة (Service)
            const { user, messagingToken } = await loginWithRole(role, pass);

            // 2. حفظ بيانات المستخدم المسترجعة في المتجر العالمي
            setUser(user);

            // 2.1 إصدار توكن المراسلة الداخلية (اختياري - لا يمنع الدخول عند فشله)
            try {
                const actor = getMessagingActor(user);
                if (actor === 'director:main' && messagingToken) {
                    // جلسة المراسلة للمدير صادرة بالفعل من الخادم أثناء تسجيل الدخول
                    // (بعد التحقق الفعلي من DIRECTOR_PASSWORD)، فلا داعي لإعادة التحقق
                    // من كلمة المرور عبر msg_login مرة أخرى.
                    useMessagingStore.getState().setSession(messagingToken, actor);
                } else if (actor) {
                    const { token, actor: canonicalActor } = await getMessagingToken(actor, pass);
                    useMessagingStore.getState().setSession(token, canonicalActor);
                }
            } catch (e) {
                console.warn('تعذر تفعيل نظام المراسلة:', e);
            }
            
            // 3. التوجيه (Routing) بناءً على دور المستخدم
            if (user.role === 'parent') {
                router.push('/parent'); // توجيه ولي الأمر لصفحة الأبناء
            } else {
                router.push('/'); // توجيه الإدارة/المعلمين للصفحة الرئيسية
            }
            
        } catch (err) {
            // --- معالجة الأخطاء (Error Handling) ---
            console.error(err);
            const message = err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول.';
            setError(message); // تخزين الرسالة لعرضها في الواجهة
            
        } finally {
            setLoading(false); // إيقاف حالة التحميل في كل الأحوال (نجاح أو فشل)
        }
    };

    // إرجاع القيم لاستخدامها داخل المكونات (Components)
    return { login, loading, error };
};
