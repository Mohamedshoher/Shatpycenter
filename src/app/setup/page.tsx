"use client";

import { useState } from 'react';
import { registerRoleAccount } from '@/features/auth/services/authService';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CheckCircle } from 'lucide-react';

export default function SetupPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleInitialSetup = async () => {
        setLoading(true);
        setError('');
        try {
            // إنشاء 3 حسابات تجريبية بكلمات مرور بسيطة
            await registerRoleAccount('director', 'admin123', 'المدير العام');
            await registerRoleAccount('supervisor', 'super123', 'المشرف التربوي');
            await registerRoleAccount('teacher', 'teacher123', 'معلم المجموعة');

            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'فشل الإعداد. قد تكون الحسابات موجودة بالفعل.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a192f] p-4 font-sans" dir="rtl">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-6 rotate-3">
                    <ShieldCheck className="text-white w-10 h-10" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">إعداد النظام الجديد</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    سيتم الآن إنشاء حسابات الوصول السريع (مدير، مشرف، مدرس) لتطابق التصميم الجديد.
                </p>

                {success ? (
                    <div className="space-y-4 py-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-bounce" />
                        <h2 className="text-xl font-bold text-green-600">تم الإعداد بنجاح!</h2>
                        <p className="text-gray-500 text-sm">جاري التوجه لشاشة تسجيل الدخول...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-2xl text-right text-sm space-y-2 border border-blue-100">
                            <p className="font-bold text-blue-600">كلمات المرور الافتراضية:</p>
                            <p>• المدير: <code className="bg-white px-2 py-0.5 rounded border font-sans">admin123</code></p>
                            <p>• المشرف: <code className="bg-white px-2 py-0.5 rounded border font-sans">super123</code></p>
                            <p>• المدرس: <code className="bg-white px-2 py-0.5 rounded border font-sans">teacher123</code></p>
                        </div>

                        {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                        <Button
                            onClick={handleInitialSetup}
                            disabled={loading}
                            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xl font-bold shadow-xl shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "ابدأ التثبيت التلقائي"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
