import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { updateTeacherAttendance } from '@/features/teachers/services/attendanceService';

// ==========================================
// 1. التعريفات والأنواع (Interfaces)
// ==========================================

export interface AutomationRule {
    id: string;
    name: string;
    trigger: 'deduction' | 'absence' | 'payment_due' | 'low_grade' | 'missing_daily_report' | 'repeated_absence' | 'repeated_exams' | 'overdue_fees';
    recipients: ('teacher' | 'parent')[];
    schedule?: { time?: string; frequency?: 'daily' | 'weekly' | 'monthly'; };
    condition: { amount?: number; absenceCount?: number; daysBeforeDue?: number; gradeThreshold?: number; checkTime?: string; deductionAmount?: number; };
    action: { type: 'send_message' | 'apply_deduction'; messageTemplate: string; };
    enabled: boolean;
    createdAt: Date;
}

export interface AutomationLog {
    id: string;
    ruleId: string;
    ruleName: string;
    triggeredBy: string;
    recipientId: string;
    recipientName: string;
    messageSent: string;
    timestamp: Date;
    status: 'success' | 'failed';
}

// ==========================================
// 2. مساعدات التواريخ (Date Utilities)
// ==========================================

const WEEKEND_DAYS = [4, 5]; // الخميس والجمعة
const DAYS_MAP = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** تحويل أي صيغة تاريخ إلى YYYY-MM-DD */
const normalizeDate = (dateInput: any): string => {
    if (!dateInput) return formatLocalDate(new Date());
    
    if (dateInput instanceof Date) return formatLocalDate(dateInput);

    const dateStr = String(dateInput);
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    
    return dateStr;
};

/** تنسيق التاريخ حسب المنطقة الزمنية المحلية (YYYY-MM-DD) */
const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ==========================================
// 3. الدوال الأساسية (CRUD & Logging)
// ==========================================

export const addLog = async (log: Omit<AutomationLog, 'id'>): Promise<AutomationLog> => {
    const res = await fetch('/api/automation/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            rule_id: log.ruleId,
            rule_name: log.ruleName,
            triggered_at: log.timestamp.toISOString(),
            status: log.status,
            details: log.messageSent,
            affected_entity_id: log.recipientId,
            affected_entity_name: log.recipientName
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'تعذر إضافة سجل الأتمتة');
    return {
        id: data.id, ruleId: data.rule_id, ruleName: data.rule_name, triggeredBy: 'system',
        recipientId: data.affected_entity_id, recipientName: data.affected_entity_name,
        messageSent: data.details, timestamp: new Date(data.triggered_at), status: data.status
    };
};

export const getLogs = async (logLimit: number = 500, selectedDateStr?: string): Promise<AutomationLog[]> => {
    try {
        const params = new URLSearchParams({ limit: String(logLimit) });
        if (selectedDateStr) params.set('date', normalizeDate(selectedDateStr));

        const res = await fetch(`/api/automation/logs?${params}`);
        if (!res.ok) {
            console.error('getLogs: API returned', res.status);
            return [];
        }
        const data = await res.json();

        const mappedLogs: AutomationLog[] = (data || []).map((row: any) => ({
            id: row.id, ruleId: row.rule_id || row.ruleId, ruleName: row.rule_name || row.ruleName, triggeredBy: 'system',
            recipientId: row.affected_entity_id || row.recipientId, recipientName: row.affected_entity_name || row.recipientName,
            messageSent: row.details || row.messageSent, timestamp: new Date(row.triggered_at || row.timestamp), status: (row.status || 'success') as any
        }));

        if (selectedDateStr) return mappedLogs;

        // آخر جلسة فحص (أحدث 150 سجل لكل تصنيف)
        const typeGroups: { [key: string]: AutomationLog[] } = { report: [], exam: [], other: [] };
        for (const log of mappedLogs) {
            const type = log.ruleName?.includes('تقارير') || log.ruleName?.includes('تقرير') ? 'report'
                : log.ruleName?.includes('اختبار') ? 'exam' : 'other';
            if (typeGroups[type]) typeGroups[type].push(log);
        }

        return [
            ...typeGroups.report.slice(0, 50),
            ...typeGroups.exam.slice(0, 50),
            ...typeGroups.other.slice(0, 50)
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
        console.error("getLogs Error:", e);
        return [];
    }
};

export const getRules = async (): Promise<AutomationRule[]> => {
    try {
        const res = await fetch('/api/automation/rules');
        if (res.ok) {
            const data = await res.json();
            const rules = (data || []).map((row: any) => ({
                id: row.id, name: row.name, trigger: row.type as any, recipients: row.recipients || [],
                schedule: row.schedule, condition: row.conditions, action: row.actions,
                enabled: row.is_active, createdAt: new Date(row.created_at)
            }));
            if (rules.length > 0) return rules;
        }
    } catch {}

    // قواعد افتراضية احتياطية إذا لم توجد في قاعدة البيانات أو فشل الاتصال
    return [
        {
            id: 'default-report-rule', name: 'خصم ربع يوم لعدم تسليم التقرير اليومي', trigger: 'missing_daily_report',
            recipients: ['teacher'], condition: { deductionAmount: 0.25 },
            action: { type: 'apply_deduction', messageTemplate: '' }, enabled: true, createdAt: new Date(),
            schedule: {}
        },
        {
            id: 'default-exam-rule', name: 'خصم نصف يوم لعدم تسجيل اختبارات لمدار اسبوع', trigger: 'repeated_exams',
            recipients: ['teacher'], condition: { deductionAmount: 0.5 },
            action: { type: 'apply_deduction', messageTemplate: '' }, enabled: true, createdAt: new Date(),
            schedule: {}
        }
    ];
};

export const createRule = async (rule: any) => {
    const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: rule.name, type: rule.trigger, is_active: rule.enabled,
            conditions: rule.condition, actions: rule.action, recipients: rule.recipients, schedule: rule.schedule
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'تعذر إنشاء القاعدة');
    return { ...rule, id: data.id, createdAt: new Date(data.created_at) };
};

export const updateRule = async (id: string, updates: any) => {
    const dbUpdates: any = { id };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.enabled !== undefined) dbUpdates.is_active = updates.enabled;
    if (updates.condition) dbUpdates.conditions = updates.condition;
    if (updates.action) dbUpdates.actions = updates.action;
    await fetch('/api/automation/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates),
    });
    return updates;
};

export const deleteRule = async (id: string) => {
    await fetch(`/api/automation/rules?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
};

export const toggleRule = async (id: string) => {
    await fetch('/api/automation/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, toggle: true }),
    });
};

// ==========================================
// 4. محرك الأتمتة الرئيسي
// ==========================================

export const executeDeduction = async (
    tId: string, tName: string, amt: number, reason: string, rId?: string, rName?: string, dDate?: string, logTs?: Date
) => {
    const targetDate = dDate || normalizeDate(new Date());
    const deduction = await teacherDeductionService.applyDeduction(tId, tName, amt, reason, 'system-automation', targetDate);
    
    // ربط الخصم بشكل مباشر بصفحة جدول حضور المدرس (تقويم المعلم)
    try {
        const attendanceStatus = amt >= 1 ? 'absent' : (amt >= 0.5 ? 'half' : 'quarter');
        await updateTeacherAttendance(tId, targetDate, attendanceStatus as any, `مخالفة أتمتة: ${reason}`);
    } catch (e) {
        console.error("Failed to post attendance to teacher profile automatically", e);
    }

    const logs = [];
    const log = await addLog({
        ruleId: rId || 'manual', ruleName: rName || 'خصم آلي', triggeredBy: 'system', recipientId: tId, recipientName: tName,
        messageSent: `[تاريخ الخصم: ${targetDate}] | تم تطبيق خصم (${amt} يوم) | السبب: ${reason}`,
        timestamp: logTs || new Date(), status: 'success'
    });
    logs.push(log);

    try {
        fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherId: tId,
                type: 'deduction',
                title: 'خصم آلي',
                message: `خصم: ${tName} - ${amt} يوم`,
                reason,
                amount: amt,
                relatedDate: targetDate,
            }),
        });
    } catch (e) {
        console.error("Failed to create auto-deduction notification", e);
    }

    return { deduction, logs };
};

export const checkMissingDailyReports = async (customDate?: string): Promise<AutomationLog[]> => {
    try {
        const target = customDate ? new Date(customDate + 'T12:00:00') : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
        const dateStr = customDate || normalizeDate(target);
        const dayOfWeek = target.getDay();
        const startTime = new Date();

        if (!customDate && WEEKEND_DAYS.includes(dayOfWeek)) return [];

        const rules = await getRules();
        const rule = rules.find(r => r.trigger === 'missing_daily_report' && r.enabled);
        if (!rule) return [];

        const checksRes = await fetch(`/api/automation/checks-data?type=daily-reports&date=${encodeURIComponent(dateStr)}`);
        if (!checksRes.ok) {
            console.error('checks-data error:', await checksRes.text());
            return [];
        }
        const result: any = await checksRes.json();
        const { teachers, groups, students: allStudents, deductions, attendance, teacherAttendance } = result;
        if (!teachers?.length) return [];

        const alreadyDeducted = new Set((deductions || []).filter((d: any) => d.reason?.includes('التقرير')).map((d: any) => d.teacher_id));
        const submittedStudents = new Set((attendance || []).map((a: any) => a.student_id));
        const absentTeachers = new Set((teacherAttendance || []).filter((a: any) => a.status === 'absent').map((a: any) => a.teacher_id));

        const groupTeacherMap = new Map<string, string>((groups || []).map((g: any) => [g.id, g.teacher_id]));
        const teacherStudentsMap = new Map<string, string[]>();
        for (const s of allStudents || []) {
            const tId = groupTeacherMap.get(s.group_id);
            if (tId) {
                const list = teacherStudentsMap.get(tId) || [];
                list.push(s.id);
                teacherStudentsMap.set(tId, list);
            }
        }

        const logs = [];
        let checkedTeachers = 0;
        let nonCompliantTeachers = 0;

        for (const t of teachers) {
            const studentIds = teacherStudentsMap.get(t.id) || [];
            if (studentIds.length === 0) continue;

            if (absentTeachers.has(t.id)) continue;

            checkedTeachers++;

            if (!studentIds.some(id => submittedStudents.has(id))) {
                nonCompliantTeachers++;
                if (!alreadyDeducted.has(t.id)) {
                    const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.25, 'عدم تسليم التقرير اليومي (أتمتة)', rule.id, 'فحص التقارير اليومية', dateStr, startTime);
                    logs.push(...res.logs);
                }
            }
        }

        if (nonCompliantTeachers === 0 && checkedTeachers > 0) {
            logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص التقارير اليومية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سلموا التقارير ليوم ${dateStr}`, timestamp: startTime, status: 'success' }));
        } else if (checkedTeachers === 0) {
            logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص التقارير اليومية', triggeredBy: 'system', recipientId: 'system', recipientName: '⚠️ تحذير', messageSent: `لم يتم العثور على معلمين للفحص ليوم ${dateStr}`, timestamp: startTime, status: 'failed' }));
        }
        return logs;
    } catch (error: any) {
        console.error('checkMissingDailyReports error:', error);
        return [];
    }
};

export const checkMissingDailyExams = async (): Promise<AutomationLog[]> => {
    const today = new Date();
    const startTime = new Date();

    // حساب نطاق الأسبوع: من السبت الماضي (بداية الأسبوع الدراسي) إلى أمس
    const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const daysSinceSaturday = (dayOfWeek - 6 + 7) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceSaturday);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - 1);

    const startDateStr = normalizeDate(weekStart);
    const endDateStr = normalizeDate(weekEnd);

    if (weekStart > weekEnd) return [];

    const rules = await getRules();
    const rule = rules.find(r => r.trigger === 'repeated_exams' && r.enabled);
    if (!rule) return [];

    const checksRes = await fetch(`/api/automation/checks-data?type=weekly-exams&startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`);
    if (!checksRes.ok) {
        console.error('checks-data error:', await checksRes.text());
        return [];
    }
    const result: any = await checksRes.json();
    const { teachers, groups, students: allStudents, exams, deductions } = result;
    if (!teachers?.length) return [];

    const examStudents = new Set((exams || []).map((e: any) => e.student_id));
    const alreadyDeducted = new Set((deductions || []).filter((d: any) => d.reason?.includes('اختبار')).map((d: any) => d.teacher_id));

    const groupTeacherMap = new Map<string, string>((groups || []).map((g: any) => [g.id, g.teacher_id]));
    const teacherStudentsMap = new Map<string, string[]>();
    for (const s of allStudents || []) {
        const tId = groupTeacherMap.get(s.group_id);
        if (tId) {
            const list = teacherStudentsMap.get(tId) || [];
            list.push(s.id);
            teacherStudentsMap.set(tId, list);
        }
    }

    const logs = [];
    let checkedTeachers = 0;
    let nonCompliantTeachers = 0;

    for (const t of teachers) {
        const studentIds = teacherStudentsMap.get(t.id) || [];
        if (studentIds.length === 0) continue;

        checkedTeachers++;

        if (!studentIds.some(id => examStudents.has(id))) {
            nonCompliantTeachers++;
            if (!alreadyDeducted.has(t.id)) {
                const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.5, 'عدم تسجيل الاختبارات لمدار اسبوع', rule.id, 'فحص الاختبارات الأسبوعية', endDateStr, startTime);
                logs.push(...res.logs);
            }
        }
    }

    if (nonCompliantTeachers === 0 && checkedTeachers > 0) {
        logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص الاختبارات الأسبوعية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سجلوا اختبارات من ${startDateStr} إلى ${endDateStr}`, timestamp: startTime, status: 'success' }));
    } else if (checkedTeachers === 0) {
        logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص الاختبارات الأسبوعية', triggeredBy: 'system', recipientId: 'system', recipientName: '⚠️ تحذير', messageSent: `لم يتم العثور على معلمين للفحص من ${startDateStr} إلى ${endDateStr}`, timestamp: startTime, status: 'failed' }));
    }
    return logs;
};

export const undoAutomationDeduction = async (logId: string, teacherId: string, timestamp: Date) => {
    const logRes = await fetch(`/api/automation/logs?id=${encodeURIComponent(logId)}`);
    if (!logRes.ok) return;
    const log = await logRes.json();
    if (!log) return;

    const match = log.details?.match(/\[تاريخ الخصم: (\d{4}-\d{2}-\d{2})\]/);
    const dateStr = match ? match[1] : normalizeDate(timestamp);

    const dedRes = await fetch(`/api/deductions?teacherId=${encodeURIComponent(teacherId)}&date=${encodeURIComponent(dateStr)}&appliedBy=system-automation`);
    const ds = dedRes.ok ? await dedRes.json() : [];
    for (const d of ds || []) await teacherDeductionService.removeDeduction(d.id);

    await fetch(`/api/automation/logs?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });

    // إزالة الغياب من الحضور أيضاً (يتم حذف السجل فيُعتبر حاضراً)
    await fetch(`/api/attendance/teacher?teacherId=${encodeURIComponent(teacherId)}&date=${encodeURIComponent(dateStr)}`, { method: 'DELETE' });
};

export const triggerAutomation = async (ruleId: string, recipientId: string, recipientName: string, data: any) => {
    const rules = await getRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    let msg = rule.action.messageTemplate;
    Object.entries(data).forEach(([k, v]) => { msg = msg.replace(`{{${k}}}`, String(v)); });
    return await addLog({ ruleId, ruleName: rule.name, triggeredBy: 'system', recipientId, recipientName, messageSent: msg, timestamp: new Date(), status: 'success' });
};

export const sendManualNotification = async (_tId: string, _tName: string, _amt: number, _type: string, _note: string, _sender?: any) => {
    console.log('Chat system removed - notification skipped');
};

// ==========================================
// 5. التصدير النهائي
// ==========================================

export const automationService = {
    getRules, getLogs, createRule, updateRule, deleteRule, toggleRule, triggerAutomation,
    checkMissingDailyReports, checkMissingDailyExams, executeDeduction, undoAutomationDeduction, sendManualNotification, addLog
};