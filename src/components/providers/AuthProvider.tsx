"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentSession } from '@/features/auth/services/authService';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        // الحماية الفعلية تجري في proxy.ts (middleware) عبر الكوكيز الآمن httpOnly.
        // هنا نتحقق فقط من مزامنة المتجر المحلي (Zustand/localStorage) مع الجلسة
        // الحقيقية على الخادم؛ أي هوية مزوَّرة في localStorage تُستبدل أو تُمسح هنا.
        let cancelled = false;
        (async () => {
            const sessionUser = await getCurrentSession();
            if (cancelled) return;
            setUser(sessionUser); // null إذا لم توجد جلسة صالحة
            setIsChecked(true);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isChecked) return;

        const isLoginPage = pathname === '/login';

        if (!user && !isLoginPage) {
            router.replace('/login');
        } else if (user && isLoginPage) {
            if (user.role === 'teacher') {
                router.replace('/students');
            } else if (user.role === 'parent') {
                router.replace('/parent');
            } else {
                router.replace('/');
            }
        }
    }, [user, pathname, router, isChecked]);

    // عدم إظهار أي شيء حتى نتأكد من صحة الجلسة الحقيقية
    if (!isChecked) return null;

    if (!user && pathname !== '/login') {
        return null;
    }

    if (user && pathname === '/login') {
        return null;
    }

    return <>{children}</>;
}
