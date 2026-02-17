"use client";

import { useEffect, useState } from 'react';
import { getOfflineQueue, removeFromOfflineQueue, PendingAction } from '@/lib/offline-queue';
import {
    addAttendanceRecord,
    addExamRecord,
    addFeeRecord,
    addPlanRecord
} from '@/features/students/services/recordsService';
import { addStudent, updateStudent, deleteStudent } from '@/features/students/services/studentService';
import { addTeacher, updateTeacher, deleteTeacher } from '@/features/teachers/services/teacherService';
import { addGroup, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import { addTransaction, deleteTransaction } from '@/features/finance/services/financeService';
import { updateTeacherAttendance } from '@/features/teachers/services/attendanceService';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, CloudSync, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SyncManager() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
    const queryClient = useQueryClient();

    const updateCount = () => {
        setPendingCount(getOfflineQueue().length);
    };

    useEffect(() => {
        updateCount();
        window.addEventListener('offlineQueueChanged', updateCount);
        window.addEventListener('online', syncAll);

        // Periodic sync attempt every 30 seconds if online
        const interval = setInterval(() => {
            if (navigator.onLine) syncAll();
        }, 30000);

        return () => {
            window.removeEventListener('offlineQueueChanged', updateCount);
            window.removeEventListener('online', syncAll);
            clearInterval(interval);
        };
    }, []);

    const syncAll = async () => {
        if (isSyncing || !navigator.onLine) return;
        const queue = getOfflineQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        console.log(`📡 البدء في مزامنة ${queue.length} عمليات مخزنة...`);

        for (const action of queue) {
            try {
                await processAction(action);
                removeFromOfflineQueue(action.id);
            } catch (error) {
                console.error(`❌ فشل مزامنة العملية ${action.id}:`, error);
                // We keep going for other records
            }
        }

        setIsSyncing(false);
        setLastSyncStatus('success');
        setTimeout(() => setLastSyncStatus(null), 10000);

        // Invalidate ALL queries to refresh everything from server
        queryClient.invalidateQueries();
    };

    const processAction = async (action: PendingAction) => {
        const { type, data } = action;
        switch (type) {
            // Records
            case 'attendance': await addAttendanceRecord(data); break;
            case 'exam': await addExamRecord(data); break;
            case 'fee': await addFeeRecord(data); break;
            case 'plan': await addPlanRecord(data); break;

            // Students
            case 'student_add': await addStudent(data); break;
            case 'student_update': await updateStudent(data.id, data.updates); break;
            case 'student_delete': await deleteStudent(data.id); break;

            // Teachers
            case 'teacher_add': await addTeacher(data); break;
            case 'teacher_update': await updateTeacher(data.id, data.updates); break;
            case 'teacher_delete': await deleteTeacher(data.id); break;

            // Groups
            case 'group_add': await addGroup(data); break;
            case 'group_update': await updateGroup(data.id, data.updates); break;
            case 'group_delete': await deleteGroup(data.id); break;

            // Finance
            case 'transaction_add': await addTransaction(data); break;
            case 'transaction_delete': await deleteTransaction(data.id); break;

            // Teacher Attendance
            case 'teacher_attendance': await updateTeacherAttendance(data.teacherId, data.date, data.status, data.notes); break;
        }
    };

    if (pendingCount === 0 && !isSyncing && !lastSyncStatus) return null;

    return (
        <div className={cn(
            "fixed top-4 left-4 z-[100] flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg border transition-all duration-500",
            isSyncing ? "bg-blue-600 text-white border-blue-500" :
                pendingCount > 0 ? "bg-amber-500 text-white border-amber-400" :
                    "bg-green-600 text-white border-green-500"
        )}>
            {isSyncing ? (
                <CloudSync size={18} className="animate-spin" />
            ) : pendingCount > 0 ? (
                <CloudOff size={18} className="animate-pulse" />
            ) : (
                <CheckCircle2 size={18} />
            )}

            <span className="text-xs font-bold whitespace-nowrap">
                {isSyncing ? 'جاري المزامنة...' :
                    pendingCount > 0 ? `بانتظار المزامنة (${pendingCount})` :
                        'تم المزامنة'}
            </span>

            {pendingCount > 0 && !isSyncing && navigator.onLine && (
                <button
                    onClick={syncAll}
                    className="mr-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg text-[10px]"
                >
                    مزامنة الآن
                </button>
            )}
        </div>
    );
}
