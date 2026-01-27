"use client";

export interface PendingAction {
    id: string;
    type: 'attendance' | 'exam' | 'fee' | 'plan';
    data: any;
    timestamp: number;
}

const QUEUE_KEY = 'shatibi_offline_queue';

export const getOfflineQueue = (): PendingAction[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading offline queue', e);
        return [];
    }
};

export const addToOfflineQueue = (type: PendingAction['type'], data: any) => {
    if (typeof window === 'undefined') return;
    const queue = getOfflineQueue();
    const newAction: PendingAction = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        data,
        timestamp: Date.now(),
    };

    // For attendance, we might want to deduplicate by studentId + day + month
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

    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    // Trigger an event so other components know the queue changed
    window.dispatchEvent(new Event('offlineQueueChanged'));
};

export const removeFromOfflineQueue = (id: string) => {
    if (typeof window === 'undefined') return;
    const queue = getOfflineQueue();
    const newQueue = queue.filter(a => a.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
    window.dispatchEvent(new Event('offlineQueueChanged'));
};

export const clearOfflineQueue = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(QUEUE_KEY);
    window.dispatchEvent(new Event('offlineQueueChanged'));
};
