"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { useState } from 'react';

// مدة الكاش: 30 دقيقة للبيانات الثابتة
const STALE_TIME = 1000 * 60 * 30;
// مدة بقاء البيانات المحفوظة على الجهاز: يجب ألا تقل gcTime عنها وإلا تُحذف قبل حفظها
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24;
const PERSIST_KEY = 'shatibi-query-cache';
// غيّر هذه القيمة عند تغيير شكل البيانات الراجعة من الـ API حتى يُتجاهل الكاش القديم المحفوظ
const PERSIST_BUSTER = 'v1';

let browserClient: QueryClient | undefined;

function makeClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: STALE_TIME,
                gcTime: PERSIST_MAX_AGE,
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

// IndexedDB بدل localStorage: سعة أكبر بكثير (قائمة الطلاب وحدها كبيرة) ولا تحجب الواجهة
const persister = typeof window === 'undefined'
    ? undefined
    : createAsyncStoragePersister({
        storage: {
            getItem: (key) => get<string>(key).then((v) => v ?? null),
            setItem: (key, value) => set(key, value),
            removeItem: (key) => del(key),
        },
        key: PERSIST_KEY,
        throttleTime: 2000,
    });

// يُستدعى عند تسجيل الدخول والخروج حتى لا يرى مستخدم بيانات مستخدم آخر استخدم نفس الجهاز
export async function clearPersistedQueryCache() {
    browserClient?.clear();
    if (typeof window !== 'undefined') {
        try {
            await del(PERSIST_KEY);
        } catch {
            // تجاهل: الكاش سيُستبدل عند أول حفظ تالٍ على كل حال
        }
    }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(getClient);

    if (!persister) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    return (
        <PersistQueryClientProvider
            client={client}
            persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: PERSIST_BUSTER }}
            // البيانات المستعادة تظهر فوراً، ثم تُحدَّث كل الاستعلامات المعروضة من النت في الخلفية
            onSuccess={() => client.invalidateQueries()}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
