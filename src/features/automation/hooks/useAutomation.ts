import { useState, useCallback, useEffect } from 'react';
import { automationService, AutomationRule, AutomationLog } from '@/features/automation/services/automationService';

/**
 * هوك مخصص (Custom Hook) لإدارة عمليات الأتمتة (Automation)
 * يوفر الدوال اللازمة لجلب، إنشاء، تحديث، وحذف قواعد الأتمتة والسجلات
 */
export const useAutomation = () => {
    // --- حالات البيانات (Data State) ---
    const [rules, setRules] = useState<AutomationRule[]>([]); // قائمة قواعد الأتمتة
    const [logs, setLogs] = useState<AutomationLog[]>([]);   // سجلات العمليات المنفذة
    const [loading, setLoading] = useState(true);           // حالة التحميل العامة
    const [error, setError] = useState<string | null>(null); // حالة الأخطاء (إضافة مقترحة)

    /**
     * جلب قواعد الأتمتة من الخدمة
     */
    const loadRules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await automationService.getRules();
            setRules(data);
        } catch (err: any) {
            setError("فشل في تحميل قواعد الأتمتة");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * جلب سجلات الأتمتة (الأحداث التي تمت)
     */
    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await automationService.getLogs();
            setLogs(data);
        } catch (err: any) {
            setError("فشل في تحميل السجلات");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * إنشاء قاعدة أتمتة جديدة
     */
    const createRule = async (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => {
        try {
            await automationService.createRule(rule);
            await loadRules(); // تحديث القائمة بعد الإضافة
        } catch (err) {
            console.error("خطأ أثناء إنشاء القاعدة:", err);
            throw err;
        }
    };

    /**
     * تحديث قاعدة موجودة
     */
    const updateRule = async (id: string, updates: Partial<AutomationRule>) => {
        try {
            await automationService.updateRule(id, updates);
            await loadRules(); // تحديث القائمة بعد التعديل
        } catch (err) {
            console.error("خطأ أثناء تحديث القاعدة:", err);
            throw err;
        }
    };

    /**
     * حذف قاعدة أتمتة
     */
    const deleteRule = async (id: string) => {
        try {
            await automationService.deleteRule(id);
            await loadRules(); // تحديث القائمة بعد الحذف
        } catch (err) {
            console.error("خطأ أثناء حذف القاعدة:", err);
            throw err;
        }
    };

    /**
     * تفعيل أو تعطيل القاعدة (Toggle Status)
     */
    const toggleRule = async (id: string) => {
        try {
            await automationService.toggleRule(id);
            await loadRules(); // تحديث القائمة ليعكس الحالة الجديدة
        } catch (err) {
            console.error("خطأ أثناء تغيير حالة القاعدة:", err);
            throw err;
        }
    };

    /**
     * إلغاء عملية أتمتة (تراجع عن الخصم)
     */
    const undoLogAction = async (logId: string, teacherId: string, timestamp: Date) => {
        setLoading(true);
        try {
            await automationService.undoAutomationDeduction(logId, teacherId, timestamp);
            await loadLogs();
        } catch (err) {
            console.error("خطأ أثناء إلغاء العملية:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // إرجاع كافة الحالات والدوال لاستخدامها في المكونات
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
        undoLogAction,
    };
};