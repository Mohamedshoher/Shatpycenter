import { useState, useCallback, useEffect } from 'react';
import { automationService, AutomationRule, AutomationLog } from '@/features/automation/services/automationService';

export const useAutomation = () => {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await automationService.getRules();
            setRules(data);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await automationService.getLogs();
            setLogs(data);
        } finally {
            setLoading(false);
        }
    }, []);

    const createRule = async (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => {
        await automationService.createRule(rule);
        await loadRules();
    };

    const updateRule = async (id: string, updates: Partial<AutomationRule>) => {
        await automationService.updateRule(id, updates);
        await loadRules();
    };

    const deleteRule = async (id: string) => {
        await automationService.deleteRule(id);
        await loadRules();
    };

    const toggleRule = async (id: string) => {
        await automationService.toggleRule(id);
        await loadRules();
    };

    return {
        rules,
        logs,
        loading,
        loadRules,
        loadLogs,
        createRule,
        updateRule,
        deleteRule,
        toggleRule,
    };
};
