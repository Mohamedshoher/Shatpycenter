import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, addGroup, updateGroup, deleteGroup } from '../services/groupService';
import { Group } from '@/types';
import { addToOfflineQueue } from '@/lib/offline-queue';

export const useGroups = () => {
    return useQuery({
        queryKey: ['groups'],
        queryFn: getGroups,
    });
};

export const useAddGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addGroup,
        onMutate: async (newGroup) => {
            await queryClient.cancelQueries({ queryKey: ['groups'] });
            const previousGroups = queryClient.getQueryData(['groups']);
            queryClient.setQueryData(['groups'], (old: any) => [...(old || []), { ...newGroup, id: 'temp-' + Date.now() }]);
            return { previousGroups };
        },
        onError: (err, newGroup) => {
            addToOfflineQueue('group_add', newGroup);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Group> }) => updateGroup(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['groups'] });
            const previousGroups = queryClient.getQueryData(['groups']);
            queryClient.setQueryData(['groups'], (old: any) => {
                if (!old) return old;
                return old.map((g: any) => g.id === id ? { ...g, ...data } : g);
            });
            return { previousGroups };
        },
        onError: (err, variables) => {
            addToOfflineQueue('group_update', { id: variables.id, updates: variables.data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteGroup,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['groups'] });
            const previousGroups = queryClient.getQueryData(['groups']);
            queryClient.setQueryData(['groups'], (old: any) => {
                if (!old) return old;
                return old.filter((g: any) => g.id !== id);
            });
            return { previousGroups };
        },
        onError: (err, id) => {
            addToOfflineQueue('group_delete', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};
