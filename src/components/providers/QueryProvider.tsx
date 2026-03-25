"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// مدة الكاش: 30 دقيقة للبيانات الثابتة، ساعة في الذاكرة
const STALE_TIME = 1000 * 60 * 10;   // 10 دقائق - لا يعيد التحميل تلقائياً
const GC_TIME   = 1000 * 60 * 60;    // ساعة في الذاكرة

let browserClient: QueryClient | undefined;

function makeClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: STALE_TIME,
                gcTime: GC_TIME,
                refetchOnWindowFocus: false,  // لا إعادة تحميل عند التنقل بين التطبيقات
                refetchOnReconnect: true,     // يُحدّث عند عودة النت
                retry: 1,                    // محاولة واحدة إعادة عند الفشل
                retryDelay: 2000,
            },
        },
    });
}

function getClient() {
    // على الخادم: كلايت جديد في كل طلب
    if (typeof window === 'undefined') return makeClient();
    // على المتصفح: كلايت واحد مشترك طول عمر الصفحة
    if (!browserClient) browserClient = makeClient();
    return browserClient;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(getClient);

    return (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    );
}
