"use client";

import { useEffect, useState } from 'react';
import { getOfflineQueue, removeFromOfflineQueue, PendingAction } from '@/lib/offline-queue';
import { addAttendanceRecord, addExamRecord, addFeeRecord, addPlanRecord } from '@/features/students/services/recordsService';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, CloudSync, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SyncManager() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
    const queryClient = useQueryClient();

    const updateCount = () => {
        setPendingCount(getOfflineQueue().length);
    };

    useEffect(() => {
        updateCount();
        window.addEventListener('offlineQueueChanged', updateCount);
        window.addEventListener('online', syncAll);

        // Periodic sync attempt every 30 seconds if online
        const interval = setInterval(() => {
            if (navigator.onLine) syncAll();
        }, 30000);

        return () => {
            window.removeEventListener('offlineQueueChanged', updateCount);
            window.removeEventListener('online', syncAll);
            clearInterval(interval);
        };
    }, []);

    const syncAll = async () => {
        if (isSyncing || !navigator.onLine) return;
        const queue = getOfflineQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        console.log(`Starting sync for ${queue.length} actions...`);

        for (const action of queue) {
            try {
                await processAction(action);
                removeFromOfflineQueue(action.id);
            } catch (error) {
                console.error(`Failed to sync action ${action.id}:`, error);
                // Stop processing if we hit a fatal error or keep going? 
                // Usually better to keep going for other records.
            }
        }

        setIsSyncing(false);
        setLastSyncStatus('success');
        setTimeout(() => setLastSyncStatus(null), 30000);

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries();
    };

    const processAction = async (action: PendingAction) => {
        switch (action.type) {
            case 'attendance':
                await addAttendanceRecord(action.data);
                break;
            case 'exam':
                await addExamRecord(action.data);
                break;
            case 'fee':
                await addFeeRecord(action.data);
                break;
            case 'plan':
                await addPlanRecord(action.data);
                break;
        }
    };

    if (pendingCount === 0 && !isSyncing && !lastSyncStatus) return null;

    return (
        <div className={cn(
            "fixed top-4 left-4 z-[100] flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg border transition-all duration-500",
            isSyncing ? "bg-blue-600 text-white border-blue-500 animate-pulse" :
                pendingCount > 0 ? "bg-amber-500 text-white border-amber-400" :
                    "bg-green-600 text-white border-green-500"
        )}>
            {isSyncing ? (
                <CloudSync size={18} className="animate-spin" />
            ) : pendingCount > 0 ? (
                <CloudOff size={18} />
            ) : (
                <CheckCircle2 size={18} />
            )}

            <span className="text-xs font-bold whitespace-nowrap">
                {isSyncing ? 'جاري المزامنة...' :
                    pendingCount > 0 ? `بانتظار المزامنة (${pendingCount})` :
                        'تمت المزامنة بنجاح'}
            </span>

            {pendingCount > 0 && !isSyncing && navigator.onLine && (
                <button
                    onClick={syncAll}
                    className="mr-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg text-[10px]"
                >
                    مزامنة الآن
                </button>
            )}
        </div>
    );
}
