import { User } from "@/types";// نوع المستخدم

/**
 * الدالة الرئيسية لتسجيل الدخول بناءً على الدور (Role)
 * تُرسل بيانات الدخول إلى نقطة نهاية على الخادم (/api/auth/login) التي تتحقق منها
 * وتُصدر جلسة موقّعة (Cookie آمن httpOnly). لا يجري أي تحقق من كلمات المرور
 * داخل المتصفح حتى لا تصل كلمات المرور أو منطق التحقق إلى حزمة جافاسكريبت للعميل.
 */
export const loginWithRole = async (identifier: string, password: string): Promise<{ user: User; messagingToken?: string }> => {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(body.error || 'حدث خطأ في تسجيل الدخول.');
    }

    return { user: body.user as User, messagingToken: body.messagingToken as string | undefined };
};

/**
 * دالة تسجيل الخروج: تُنهي الجلسة على الخادم (تمسح الكوكيز الآمن)
 */
export const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
};

/**
 * جلب بيانات المستخدم الحالي من الجلسة الفعلية على الخادم (Cookie آمن)
 * يُستخدم للتحقق من صحة الجلسة بدل الثقة العمياء بما هو مخزَّن في localStorage
 */
export const getCurrentSession = async (): Promise<User | null> => {
    try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) return null;
        const body = await res.json();
        return body.user as User;
    } catch {
        return null;
    }
};
