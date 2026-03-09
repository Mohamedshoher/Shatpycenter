"use client";

import { get, set, del } from 'idb-keyval';

export interface PendingAction {
    id: string;
    type: 'attendance' | 'exam' | 'fee' | 'plan' | 'student_add' | 'student_update' | 'student_delete' | 'teacher_add' | 'teacher_update' | 'teacher_delete' | 'group_add' | 'group_update' | 'group_delete' | 'transaction_add' | 'transaction_delete' | 'teacher_attendance';
    data: any;
    timestamp: number;
}

const QUEUE_KEY = 'shatibi_offline_queue';

export const getOfflineQueue = async (): Promise<PendingAction[]> => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = await get<PendingAction[]>(QUEUE_KEY);
        return stored || [];
    } catch (e) {
        console.error('Error reading offline queue', e);
        return [];
    }
};

export const addToOfflineQueue = async (type: PendingAction['type'], data: any) => {
    if (typeof window === 'undefined') return;
    const queue = await getOfflineQueue();
    const newAction: PendingAction = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        data,
        timestamp: Date.now(),
    };

    // For specific records, we might want to deduplicate
    if (type === 'attendance') {
        const index = queue.findIndex(a =>
            a.type === 'attendance' &&
            a.data.studentId === data.studentId &&
            a.data.day === data.day &&
            a.data.month === data.month
        );
        if (index > -1) {
            queue[index] = newAction; // Update existing
        } else {
            queue.push(newAction);
        }
    } else {
        queue.push(newAction);
    }

    await set(QUEUE_KEY, queue);
    // Trigger an event so other components know the queue changed
    window.dispatchEvent(new Event('offlineQueueChanged'));
};

export const removeFromOfflineQueue = async (id: string) => {
    if (typeof window === 'undefined') return;
    const queue = await getOfflineQueue();
    const newQueue = queue.filter(a => a.id !== id);
    await set(QUEUE_KEY, newQueue);
    window.dispatchEvent(new Event('offlineQueueChanged'));
};

export const clearOfflineQueue = async () => {
    if (typeof window === 'undefined') return;
    await del(QUEUE_KEY);
    window.dispatchEvent(new Event('offlineQueueChanged'));
};
