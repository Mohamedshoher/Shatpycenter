import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent } from '../services/studentService';
import { Student } from '@/types';
import { addToOfflineQueue } from '@/lib/offline-queue';

export const useStudents = () => {
    const queryClient = useQueryClient();

    const studentsQuery = useQuery({
        queryKey: ['students'],
        queryFn: getStudents,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, groupId }: { id: string, status: 'active' | 'archived', groupId?: string | null }) => {
            const updateData: Partial<Student> = { status };
            if (status === 'active' && groupId !== undefined) {
                updateData.groupId = groupId;
            }
            if (status === 'archived') {
                updateData.archivedDate = new Date().toISOString().split('T')[0];
            }
            return updateStudent(id, updateData);
        },
        onMutate: async ({ id, status, groupId }) => {
            await queryClient.cancelQueries({ queryKey: ['students'] });
            const previousStudents = queryClient.getQueryData(['students']);
            queryClient.setQueryData(['students'], (old: any) => {
                if (!old) return old;
                return old.map((s: any) => s.id === id ? { ...s, status, groupId: status === 'active' ? groupId : s.groupId } : s);
            });
            return { previousStudents };
        },
        onError: (err, variables) => {
            const updateData: Partial<Student> = { status: variables.status };
            if (variables.status === 'active') updateData.groupId = variables.groupId;
            addToOfflineQueue('student_update', { id: variables.id, updates: updateData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    const deleteStudentMutation = useMutation({
        mutationFn: (id: string) => {
            const { deleteStudent: deleteStudentService } = require('../services/studentService');
            return deleteStudentService(id);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['students'] });
            const previousStudents = queryClient.getQueryData(['students']);
            queryClient.setQueryData(['students'], (old: any) => {
                if (!old) return old;
                return old.filter((s: any) => s.id !== id);
            });
            return { previousStudents };
        },
        onError: (err, id) => {
            addToOfflineQueue('student_delete', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    return {
        ...studentsQuery,
        archiveStudent: (id: string) => updateStatusMutation.mutate({ id, status: 'archived' }),
        restoreStudent: (id: string, groupId: string | null) => updateStatusMutation.mutate({ id, status: 'active', groupId }),
        deleteStudent: (id: string) => deleteStudentMutation.mutate(id),
    };
};
