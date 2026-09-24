import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppNotification } from '@/types';
import { getNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } from '../services/notificationService';

export const useNotifications = (teacherId?: string) => {
    return useQuery({
        queryKey: ['notifications', teacherId],
        queryFn: () => getNotifications(teacherId),
        refetchInterval: 30000,
        staleTime: 15000,
    });
};

export const useUnreadCount = (teacherId?: string) => {
    const { data: notifications } = useNotifications(teacherId);
    return notifications?.filter(n => !n.isRead).length || 0;
};

export const useCreateNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            teacherId: string | null;
            type: 'deduction' | 'reward' | 'system';
            title: string;
            message: string;
            reason?: string;
            amount?: number;
            relatedDate?: string;
        }) => createNotification(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (teacherId?: string) => markAllAsRead(teacherId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (err: Error) => {
            console.error('فشل تحديث القراءة:', err.message);
        },
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useClearAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (teacherId?: string) => clearAllNotifications(teacherId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (err: Error) => {
            console.error('فشل حذف الإشعارات:', err.message);
        },
    });
};
