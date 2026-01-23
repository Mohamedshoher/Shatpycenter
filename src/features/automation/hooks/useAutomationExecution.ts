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
      const createdLogs = await automationService.checkMissingDailyReports();
      setLogs(createdLogs);
      return createdLogs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(errorMessage);
      console.error('خطأ في تنفيذ قاعدة الخصم:', errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // تنفيذ قاعدة محددة بناءً على المعلمة
  const executeRule = useCallback(
    async (ruleId: string, teacherId: string, teacherName: string, data?: Record<string, any>) => {
      setIsExecuting(true);
      setError(null);
      try {
        const ruleLogs = await automationService.executeRule(ruleId, teacherId, teacherName, data);
        setLogs(ruleLogs);
        return ruleLogs;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
        setError(errorMessage);
        console.error('خطأ في تنفيذ القاعدة:', errorMessage);
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  // تطبيق خصم يدوي
  const applyManualDeduction = useCallback(
    async (teacherId: string, teacherName: string, amount: number, reason: string) => {
      setIsExecuting(true);
      setError(null);
      try {
        const result = await automationService.executeDeduction(teacherId, teacherName, amount, reason);
        setLogs(result.logs);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
        setError(errorMessage);
        console.error('خطأ في تطبيق الخصم:', errorMessage);
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return {
    isExecuting,
    error,
    logs,
    executeMissingReportDeduction,
    executeRule,
    applyManualDeduction,
  };
};
