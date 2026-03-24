"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';

// مدة الكاش: 24 ساعة
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 10,  // 10 دقائق - لا يعيد التحميل تلقائياً
                gcTime: ONE_DAY_MS,          // يحتفظ بالبيانات يوم كامل في الذاكرة
                refetchOnWindowFocus: false, // لا إعادة تحميل عند كل نقرة
                refetchOnReconnect: true,    // يُحدِّث عند عودة النت
                retry: 1,                   // محاولة إعادة واحدة فقط عند فشل النت
                retryDelay: 3000,           // ينتظر 3 ثواني قبل إعادة المحاولة
            },
        },
    });
}

let clientQueryClient: QueryClient | undefined;
function getQueryClient() {
    if (typeof window === 'undefined') return makeQueryClient();
    if (!clientQueryClient) clientQueryClient = makeQueryClient();
    return clientQueryClient;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(getQueryClient);
    const [persister, setPersister] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // نحفظ الكاش في localStorage ليبقى بعد إغلاق المتصفح
        try {
            const p = createSyncStoragePersister({
                storage: window.localStorage,
                key: 'shatby-query-cache',
            });
            setPersister(p);
        } catch {
            // localStorage غير متاح (وضع خاص أو قديم)
        }
        setMounted(true);
    }, []);

    // قبل الـ mount نعرض بدون persist لتجنب hydration errors
    if (!mounted) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    }

    // بعد الـ mount: إذا يعمل localStorage نستخدم PersistQueryClientProvider
    if (persister) {
        return (
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                    persister,
                    maxAge: ONE_DAY_MS,      // الكاش يبقى يوم كامل في localStorage
                    buster: 'v1',            // غيّر هذا عند تغيير هيكل البيانات
                }}
            >
                {children}
            </PersistQueryClientProvider>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
