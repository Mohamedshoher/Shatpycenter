import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithRole } from '../services/authService';
import { useAuthStore } from '@/store/useAuthStore';

export const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const setUser = useAuthStore((state) => state.setUser);
    const router = useRouter();

    const login = async (role: string, pass: string) => {
        setLoading(true);
        setError(null);
        try {
            const user = await loginWithRole(role, pass);
            setUser(user);
            if (user.role === 'parent') {
                router.push('/parent');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            console.error(err);
            let message = 'حدث خطأ في تسجيل الدخول.';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                message = 'بيانات الدخول غير صحيحة.';
            } else if (err.code === 'auth/configuration-not-found') {
                message = 'يجب تفعيل Email/Password في إعدادات Firebase.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return { login, loading, error };
};
