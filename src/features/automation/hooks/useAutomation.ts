import { useState, useCallback } from 'react';
import type { AutomationRule, AutomationLog } from '@/features/automation/services/automationService';
import { automationService } from '@/features/automation/services/automationService';

export const useAutomation = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await automationService.getRules();
      setRules(data);
    } catch (err) {
      setError('خطأ في تحميل القواعس');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await automationService.getLogs();
      setLogs(data);
    } catch (err) {
      setError('خطأ في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => {
    try {
      const newRule = await automationService.createRule(rule);
      setRules((prev) => [...prev, newRule]);
      return newRule;
    } catch (err) {
      setError('خطأ في إنشاء القاعدة');
    }
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<AutomationRule>) => {
    try {
      const updated = await automationService.updateRule(id, updates);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      setError('خطأ في تحديث القاعدة');
    }
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    try {
      await automationService.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError('خطأ في حذف القاعدة');
    }
  }, []);

  const toggleRule = useCallback(async (id: string) => {
    try {
      const updated = await automationService.toggleRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      setError('خطأ في تغيير حالة القاعدة');
    }
  }, []);

  const triggerRule = useCallback(
    async (ruleId: string, recipientId: string, recipientName: string, data: Record<string, any>) => {
      try {
        const log = await automationService.triggerAutomation(ruleId, recipientId, recipientName, data);
        setLogs((prev) => [log, ...prev]);
        return log;
      } catch (err) {
        setError('خطأ في تنفيذ الأتمتة');
      }
    },
    []
  );

  return {
    rules,
    logs,
    loading,
    error,
    loadRules,
    loadLogs,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    triggerRule,
  };
};
