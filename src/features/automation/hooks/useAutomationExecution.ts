import { useState, useCallback } from 'react';
import { automationService } from '@/features/automation/services/automationService';

export const useAutomationExecution = () => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // تنفيذ قاعدة الخصم التلقائي
    const executeMissingReportDeduction = useCallback(async () => {
        setIsExecuting(true);
        setError(null);
        try {
            // هنا نستدعي الخدمة المحدثة التي تتأكد من عدم التكرار
            const createdLogs = await automationService.checkMissingDailyReports();
            setLogs(createdLogs);
            return createdLogs;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
            setError(errorMessage);
            console.error('خطأ في تنفيذ قاعدة الخصم:', errorMessage);
            return [];
        } finally {
            setIsExecuting(false);
        }
    }, []);

    return {
        isExecuting,
        error,
        logs,
        executeMissingReportDeduction,
    };
};
