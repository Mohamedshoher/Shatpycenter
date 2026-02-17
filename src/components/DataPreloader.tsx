"use client";

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getGroups } from '@/features/groups/services/groupService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { useAuthStore } from '@/store/useAuthStore';
import { CloudDownload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DataPreloader() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'idle' | 'loading' | 'completed'>('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!user || status !== 'idle' || !navigator.onLine) return;

        const preload = async () => {
            setStatus('loading');
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const tasks = [
                { name: 'الطلاب', fn: () => queryClient.prefetchQuery({ queryKey: ['students'], queryFn: getStudents }) },
                { name: 'المعلمين', fn: () => queryClient.prefetchQuery({ queryKey: ['teachers'], queryFn: getTeachers }) },
                { name: 'المجموعات', fn: () => queryClient.prefetchQuery({ queryKey: ['groups'], queryFn: getGroups }) },
                { name: 'الرسوم', fn: () => queryClient.prefetchQuery({ queryKey: ['all-fees', currentMonth], queryFn: () => getFeesByMonth(currentMonth) }) },
                { name: 'المعاملات', fn: () => queryClient.prefetchQuery({ queryKey: ['transactions', currentMonth], queryFn: () => getTransactionsByMonth(now.getFullYear(), now.getMonth() + 1) }) },
            ];

            for (let i = 0; i < tasks.length; i++) {
                try {
                    await tasks[i].fn();
                } catch (e) {
                    console.warn(`Failed to preload ${tasks[i].name}`, e);
                }
                setProgress(Math.round(((i + 1) / tasks.length) * 100));
            }

            setStatus('completed');
            setTimeout(() => setStatus('idle'), 5000);
        };

        preload();
    }, [user, queryClient]);

    return (
        <AnimatePresence>
            {status !== 'idle' && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-24 right-4 z-[90] bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[200px]"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        {status === 'completed' ? <Check size={20} /> : <CloudDownload size={20} className="animate-bounce" />}
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-gray-800">
                            {status === 'completed' ? 'تم تحديث البيانات' : 'جاري تحميل البيانات...'}
                        </p>
                        {status === 'loading' && (
                            <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
