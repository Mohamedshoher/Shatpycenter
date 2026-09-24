import { AppNotification } from '@/types';

const BASE_URL = '/api/notifications';

export const getNotifications = async (teacherId?: string, limit: number = 20): Promise<AppNotification[]> => {
    try {
        const params = new URLSearchParams();
        if (teacherId) params.set('teacherId', teacherId);
        params.set('limit', String(limit));

        const res = await fetch(`${BASE_URL}?${params}`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
};

export const createNotification = async (data: {
    teacherId: string | null;
    type: 'deduction' | 'reward' | 'system';
    title: string;
    message: string;
    reason?: string;
    amount?: number;
    relatedDate?: string;
}): Promise<AppNotification | null> => {
    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

export const markAsRead = async (id: string): Promise<boolean> => {
    try {
        const res = await fetch(BASE_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        return res.ok;
    } catch {
        return false;
    }
};

export const deleteNotification = async (id: string): Promise<boolean> => {
    try {
        const res = await fetch(`${BASE_URL}?id=${id}`, { method: 'DELETE' });
        return res.ok;
    } catch {
        return false;
    }
};

export const clearAllNotifications = async (teacherId?: string): Promise<boolean> => {
    const params = new URLSearchParams({ all: 'true' });
    if (teacherId) params.set('teacherId', teacherId);
    const res = await fetch(`${BASE_URL}?${params}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'فشل حذف الإشعارات');
    }
    return true;
};

export const markAllAsRead = async (teacherId?: string): Promise<boolean> => {
    try {
        const res = await fetch(BASE_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true, teacherId }),
        });
        return res.ok;
    } catch {
        return false;
    }
};
