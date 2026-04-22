import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIqraProgress, updateIqraProgress, getIqraLogs, addIqraLog, deleteIqraLog, IqraProgress, IqraLog } from '../services/iqraService';
import IqraBookSection from './IqraBookSection';
import IqraLogForm from './IqraLogForm';
import IqraHistoryList from './IqraHistoryList';
import { motion } from 'framer-motion';

interface IqraTabProps {
    student: any;
}

export default function IqraTab({ student }: IqraTabProps) {
    const queryClient = useQueryClient();
    const studentId = student.id;

    // جلب البيانات
    const { data: progress, isLoading: isLoadingProgress } = useQuery({
        queryKey: ['iqra-progress', studentId],
        queryFn: () => getIqraProgress(studentId),
        enabled: !!studentId
    });

    const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
        queryKey: ['iqra-logs', studentId],
        queryFn: () => getIqraLogs(studentId),
        enabled: !!studentId
    });

    // العمليات (Mutations)
    const updateProgressMutation = useMutation({
        mutationFn: (data: Partial<IqraProgress>) => updateIqraProgress(studentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-progress', studentId] });
        }
    });

    const addLogMutation = useMutation({
        mutationFn: (log: Omit<IqraLog, 'id' | 'student_id' | 'created_at'>) => addIqraLog(studentId, log),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-logs', studentId] });
        }
    });

    const deleteLogMutation = useMutation({
        mutationFn: deleteIqraLog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-logs', studentId] });
        }
    });

    if (isLoadingProgress || isLoadingLogs) {
        return <div className="py-20 text-center font-bold text-gray-400">جاري تحميل المعطيات...</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-10"
        >
            {/* القسم العلوي: بيانات الكتاب والدورة */}
            <IqraBookSection 
                data={progress || {}} 
                onUpdate={(data) => updateProgressMutation.mutate(data)} 
                isUpdating={updateProgressMutation.isPending} 
            />

            {/* القسم الأوسط: تسجيل متابعة جديدة */}
            <IqraLogForm 
                onSubmit={(log) => addLogMutation.mutate(log)} 
                isSubmitting={addLogMutation.isPending} 
            />

            {/* القسم السفلي: السجل التاريخي */}
            <IqraHistoryList 
                logs={logs} 
                onDelete={(id) => deleteLogMutation.mutate(id)} 
            />
        </motion.div>
    );
}
