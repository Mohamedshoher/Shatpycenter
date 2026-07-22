import { supabase } from '@/lib/supabase';
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
    const { data, error } = await supabase.from('automation_logs').insert([{
        rule_id: log.ruleId,
        rule_name: log.ruleName,
        triggered_at: log.timestamp.toISOString(),
        status: log.status,
        details: log.messageSent,
        affected_entity_id: log.recipientId,
        affected_entity_name: log.recipientName
    }]).select().single();
    if (error) throw error;
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
    const { data, error } = await supabase.from('automation_rules').insert([{
        name: rule.name, type: rule.trigger, is_active: rule.enabled,
        conditions: rule.condition, actions: rule.action, recipients: rule.recipients, schedule: rule.schedule
    }]).select().single();
    if (error) throw error;
    return { ...rule, id: data.id, createdAt: new Date(data.created_at) };
};

export const updateRule = async (id: string, updates: any) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.enabled !== undefined) dbUpdates.is_active = updates.enabled;
    if (updates.condition) dbUpdates.conditions = updates.condition;
    if (updates.action) dbUpdates.actions = updates.action;
    await supabase.from('automation_rules').update(dbUpdates).eq('id', id);
    return updates;
};

export const deleteRule = async (id: string) => { await supabase.from('automation_rules').delete().eq('id', id); };

export const toggleRule = async (id: string) => {
    const { data: current } = await supabase.from('automation_rules').select('is_active').eq('id', id).single();
    await supabase.from('automation_rules').update({ is_active: !current?.is_active }).eq('id', id);
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

export const checkMissingDailyReports = async (): Promise<AutomationLog[]> => {
    try {
        const target = new Date(); target.setDate(target.getDate() - 1);
        const dateStr = normalizeDate(target);
        const dayOfWeek = target.getDay();
        const startTime = new Date();

        if (WEEKEND_DAYS.includes(dayOfWeek)) return [];

        const rules = await getRules();
        const rule = rules.find(r => r.trigger === 'missing_daily_report' && r.enabled);
        if (!rule) return [];

        const { data: teachers } = await supabase.from('teachers').select('id, full_name').eq('status', 'active');
        if (!teachers?.length) return [];

        const teacherIds = teachers.map(t => t.id);

        const [ dedResult, groupsResult, attResult, teaResult ] = await Promise.all([
            supabase.from('deductions').select('teacher_id, reason').in('teacher_id', teacherIds).eq('date', dateStr).eq('applied_by', 'system-automation'),
            supabase.from('groups').select('id, teacher_id').in('teacher_id', teacherIds),
            supabase.from('attendance').select('student_id').eq('date', dateStr),
            supabase.from('teacher_attendance').select('teacher_id, status').in('teacher_id', teacherIds).eq('date', dateStr)
        ]);

        if (dedResult.error) console.error('dedResult error:', dedResult.error);
        if (groupsResult.error) console.error('groupsResult error:', groupsResult.error);
        if (attResult.error) console.error('attResult error:', attResult.error);
        if (teaResult.error) console.error('teaResult error:', teaResult.error);

        const alreadyDeducted = new Set(dedResult.data?.filter(d => d.reason?.includes('تقرير')).map(d => d.teacher_id));
        const submittedStudents = new Set(attResult.data?.map(a => a.student_id));
        const absentTeachers = new Set(teaResult.data?.filter(a => a.status === 'absent').map(a => a.teacher_id));

        const groupIds = groupsResult.data?.map(g => g.id) || [];
        const { data: allStudents } = groupIds.length > 0
            ? await supabase.from('students').select('id, group_id').in('group_id', groupIds)
            : { data: [] };
        const groupTeacherMap = new Map(groupsResult.data?.map(g => [g.id, g.teacher_id]) || []);
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

        for (const t of teachers) {
            const studentIds = teacherStudentsMap.get(t.id) || [];
            if (studentIds.length === 0) continue;

            if (absentTeachers.has(t.id)) continue;

            if (!studentIds.some(id => submittedStudents.has(id)) && !alreadyDeducted.has(t.id)) {
                const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.25, 'عدم تسليم التقرير اليومي (أتمتة)', rule.id, 'فحص التقارير اليومية', dateStr, startTime);
                logs.push(...res.logs);
            }
        }

        if (logs.length === 0) {
            logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص التقارير اليومية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سلموا التقارير ليوم ${dateStr}`, timestamp: startTime, status: 'success' }));
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

    const { data: teachers } = await supabase.from('teachers').select('id, full_name').eq('status', 'active');
    if (!teachers?.length) return [];

    const teacherIds = teachers.map(t => t.id);

    const [ groupsResult, examsResult, dedResult ] = await Promise.all([
        supabase.from('groups').select('id, teacher_id').in('teacher_id', teacherIds),
        supabase.from('exams').select('student_id').gte('date', startDateStr).lte('date', endDateStr),
        supabase.from('deductions').select('teacher_id, reason').in('teacher_id', teacherIds).gte('date', startDateStr).lte('date', endDateStr)
    ]);

    const examStudents = new Set(examsResult.data?.map(e => e.student_id));
    const alreadyDeducted = new Set(dedResult.data?.filter(d => d.reason?.includes('اختبار')).map(d => d.teacher_id));

    // جلب الطلاب لكل مجموعة
    const groupIds = groupsResult.data?.map(g => g.id) || [];
    const { data: allStudents } = groupIds.length > 0
        ? await supabase.from('students').select('id, group_id').in('group_id', groupIds)
        : { data: [] };
    const groupTeacherMap = new Map(groupsResult.data?.map(g => [g.id, g.teacher_id]) || []);
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

    for (const t of teachers) {
        const studentIds = teacherStudentsMap.get(t.id) || [];
        if (studentIds.length === 0) continue;

        if (!studentIds.some(id => examStudents.has(id)) && !alreadyDeducted.has(t.id)) {
                const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.5, 'عدم تسجيل الاختبارات لمدار اسبوع', rule.id, 'فحص الاختبارات الأسبوعية', endDateStr, startTime);
                logs.push(...res.logs);
            }
    }

    if (logs.length === 0) {
        logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص الاختبارات الأسبوعية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سجلوا اختبارات من ${startDateStr} إلى ${endDateStr}`, timestamp: startTime, status: 'success' }));
    }
    return logs;
};

export const undoAutomationDeduction = async (logId: string, teacherId: string, timestamp: Date) => {
    const { data: log } = await supabase.from('automation_logs').select('details').eq('id', logId).single();
    if (!log) return;
    const match = log.details.match(/\[تاريخ الخصم: (\d{4}-\d{2}-\d{2})\]/);
    const dateStr = match ? match[1] : normalizeDate(timestamp);
    const { data: ds } = await supabase.from('deductions').select('id').eq('teacher_id', teacherId).eq('date', dateStr).eq('applied_by', 'system-automation');
    if (ds) for (const d of ds) await teacherDeductionService.removeDeduction(d.id);
    await supabase.from('automation_logs').delete().eq('id', logId);
    
    // إزالة الغياب من الحضور أيضاً (يتم حذف السجل فيُعتبر حاضراً)
    await supabase.from('teacher_attendance').delete().eq('teacher_id', teacherId).eq('date', dateStr);
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