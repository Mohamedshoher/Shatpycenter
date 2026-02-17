"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { get, set, del } from 'idb-keyval';

/**
 * Custom persister for IndexedDB using idb-keyval
 * This allows storing much more data than localStorage (up to several GBs)
 */
const indexedDBPersister = {
    persistClient: async (client: any) => {
        await set('OFFLINE_CACHE_IDB', client);
    },
    restoreClient: async () => {
        return await get('OFFLINE_CACHE_IDB');
    },
    removeClient: async () => {
        await del('OFFLINE_CACHE_IDB');
    },
};

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 30, // 30 minutes
                gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (keep data for a long time)
                refetchOnWindowFocus: false,
                retry: 1,
                // Ensure data is fetched from cache when offline
                networkMode: 'offlineFirst',
            },
            mutations: {
                networkMode: 'offlineFirst',
            }
        },
    }));

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister: indexedDBPersister,
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            }}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
