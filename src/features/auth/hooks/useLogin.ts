import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithRole } from '../services/authService';
import { useAuthStore } from '@/store/useAuthStore';

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
            const user = await loginWithRole(role, pass);
            
            // 2. حفظ بيانات المستخدم المسترجعة في المتجر العالمي
            setUser(user);
            
            // 3. التوجيه (Routing) بناءً على دور المستخدم
            if (user.role === 'parent') {
                router.push('/parent'); // توجيه ولي الأمر لصفحة الأبناء
            } else {
                router.push('/'); // توجيه الإدارة/المعلمين للصفحة الرئيسية
            }
            
        } catch (err: any) {
            // --- معالجة الأخطاء (Error Handling) ---
            console.error(err);
            let message = err.message || 'حدث خطأ في تسجيل الدخول.';

            // تحويل أكواد خطأ Firebase إلى رسائل مفهومة للمستخدم باللغة العربية
            if (
                err.code === 'auth/user-not-found' || 
                err.code === 'auth/wrong-password' || 
                err.code === 'auth/invalid-credential' || 
                err.code === 'auth/invalid-email'
            ) {
                message = 'بيانات الدخول غير صحيحة.';
            } else if (err.code === 'auth/configuration-not-found') {
                message = 'يجب تفعيل Email/Password في إعدادات Firebase.';
            }

            setError(message); // تخزين الرسالة لعرضها في الواجهة
            
        } finally {
            setLoading(false); // إيقاف حالة التحميل في كل الأحوال (نجاح أو فشل)
        }
    };

    // إرجاع القيم لاستخدامها داخل المكونات (Components)
    return { login, loading, error };
};
