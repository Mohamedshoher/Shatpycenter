"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentSession } from '@/features/auth/services/authService';

// شاشة بداية خفيفة تظهر فوراً بدل شاشة بيضاء فارغة أثناء التحقق من الجلسة عبر الشبكة
const SplashScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-50 p-2 animate-pulse">
                <Image src="/icon-192.png" alt="مركز الشاطبي" width={64} height={64} className="w-full h-full object-contain" priority />
            </div>
            <div className="w-6 h-6 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
    </div>
);

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

    // شاشة بداية بدل الفراغ الأبيض أثناء التحقق من صحة الجلسة عبر الشبكة
    if (!isChecked) return <SplashScreen />;

    if (!user && pathname !== '/login') {
        return null;
    }

    if (user && pathname === '/login') {
        return null;
    }

    return <>{children}</>;
}
