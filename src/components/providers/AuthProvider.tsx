"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // بمجرد تحميل المكون، نعتبر أن الـ hydration تم بنجاح
        // هذا يسمح لنا بالوصول للبيانات المخزنة في localStorage
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;

        const isLoginPage = pathname === '/login';

        if (!user && !isLoginPage) {
            // إذا لم يكن مسجلاً للدخول وليس في صفحة الدخول، حوله للدخول
            router.replace('/login');
        } else if (user && isLoginPage) {
            // إذا كان مسجلاً للدخول وحاول فتح صفحة الدخول، حوله للرئيسية
            if (user.role === 'teacher') {
                router.replace('/students');
            } else {
                router.replace('/');
            }
        }
    }, [user, pathname, router, isHydrated]);

    // عدم إظهار أي شيء حتى نتأكد من حالة الملف (Client Hydration)
    if (!isHydrated) return null;

    // إذا لم يكن مسجلاً ويحاول فتح صفحة محمية، لا تظهر المحتوى (بيكون بيحول حالياً)
    if (!user && pathname !== '/login') {
        return null;
    }

    return <>{children}</>;
}
