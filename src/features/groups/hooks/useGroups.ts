import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, addGroup, updateGroup, deleteGroup } from '../services/groupService';
import { Group } from '@/types';

export const useGroups = () => {
    return useQuery({
        queryKey: ['groups'],
        queryFn: getGroups,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useAddGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Group> }) => updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};
