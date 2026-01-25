import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent } from '../services/studentService';
import { Student } from '@/types';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    const deleteStudentMutation = useMutation({
        mutationFn: (id: string) => {
            const { deleteStudent: deleteStudentService } = require('../services/studentService');
            return deleteStudentService(id);
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
