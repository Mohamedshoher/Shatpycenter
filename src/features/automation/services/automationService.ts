import { supabase } from '@/lib/supabase';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { chatService } from '@/features/chat/services/chatService';
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
    if (!dateInput) return new Date().toISOString().split('T')[0];
    
    // إذا كان كائن تاريخ
    if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];

    // إذا كان نصاً
    const dateStr = String(dateInput);
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // معالجة DD/MM/YYYY
        if (parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    
    return dateStr; // نأمل أن يكون YYYY-MM-DD
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

export const getLogs = async (logLimit: number = 1500, selectedDateStr?: string): Promise<AutomationLog[]> => {
    try {
        const { data, error } = await supabase.from('automation_logs')
            .select('*')
            .order('triggered_at', { ascending: false })
            .limit(logLimit);

        if (error || !data) return [];

        let mappedLogs = data.map(row => ({
            id: row.id, ruleId: row.rule_id, ruleName: row.rule_name, triggeredBy: 'system',
            recipientId: row.affected_entity_id, recipientName: row.affected_entity_name,
            messageSent: row.details, timestamp: new Date(row.triggered_at), status: row.status as any
        }));

        if (selectedDateStr) {
            const formattedDate = normalizeDate(selectedDateStr); // e.g. "2026-04-07"
            
            mappedLogs = mappedLogs.filter(log => {
                const logDateStr = log.timestamp.toISOString().split('T')[0];
                const containsInDetails = log.messageSent && log.messageSent.includes(formattedDate);
                const executedThatDay = logDateStr === formattedDate;
                
                return executedThatDay || containsInDetails;
            });
            return mappedLogs;
        }

        // إذا لم يختر، نعيد آخر جلسة فحص لكل نوع على حدة (آخر 10 دقائق من أحدث سجل لكل تصنيف)
        if (mappedLogs.length === 0) return mappedLogs;

        const reportLogs = mappedLogs.filter(log => log.ruleName.includes('تقرير') || log.ruleName.includes('تقارير'));
        const examLogs = mappedLogs.filter(log => log.ruleName.includes('اختبار'));
        const otherLogs = mappedLogs.filter(log => !log.ruleName.includes('تقرير') && !log.ruleName.includes('تقارير') && !log.ruleName.includes('اختبار'));

        const getLatestSession = (list: any[]) => {
            if (list.length === 0) return [];
            const latest = list[0].timestamp.getTime();
            return list.filter(log => (latest - log.timestamp.getTime()) <= 10 * 60 * 1000);
        };

        return [
            ...getLatestSession(reportLogs),
            ...getLatestSession(examLogs),
            ...getLatestSession(otherLogs)
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
        console.error("getLogs Error:", e);
        return [];
    }
};

export const getRules = async (): Promise<AutomationRule[]> => {
    const { data, error } = await supabase.from('automation_rules').select('*');
    if (error) return [];
    return data.map(row => ({
        id: row.id, name: row.name, trigger: row.type as any, recipients: row.recipients || [],
        schedule: row.schedule, condition: row.conditions, action: row.actions,
        enabled: row.is_active, createdAt: new Date(row.created_at)
    }));
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

    // إرسال إشعار فوري وتلقائي عبر الشات للمعلم
    try {
        const convo = await chatService.getOrCreateConversation(['system', tId], ['نظام الأتمتة', tName], 'system-teacher');
        await chatService.sendMessage(
            convo.id, 
            'system', 
            'نظام الأتمتة', 
            'director', 
            `🔔 تنبيه آلي: تم تطبيق خصم (${amt} يوم) من رصيدك الخاص. \nتاريخ الخصم: ${targetDate}\nالسبب: ${reason}`
        );
    } catch (e) {
        console.error("Failed to send chat notification", e);
    }

    const logs = [];
    const log = await addLog({
        ruleId: rId || 'manual', ruleName: rName || 'خصم آلي', triggeredBy: 'system', recipientId: tId, recipientName: tName,
        messageSent: `[تاريخ الخصم: ${targetDate}] | تم تطبيق خصم (${amt} يوم) | السبب: ${reason}`,
        timestamp: logTs || new Date(), status: 'success'
    });
    logs.push(log);
    return { deduction, logs };
};

export const checkMissingDailyReports = async (): Promise<AutomationLog[]> => {
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
    const [ { data: allDeductions }, { data: allGroups }, { data: allAttendance } ] = await Promise.all([
        supabase.from('deductions').select('teacher_id').in('teacher_id', teacherIds).eq('date', dateStr).eq('applied_by', 'system-automation'),
        supabase.from('groups').select('teacher_id, students(id)').in('teacher_id', teacherIds),
        supabase.from('attendance').select('student_id').gte('date', `${dateStr}T00:00:00`).lte('date', `${dateStr}T23:59:59`)
    ]);

    const alreadyDeducted = new Set(allDeductions?.map(d => d.teacher_id));
    const submittedStudents = new Set(allAttendance?.map(a => a.student_id));
    const logs = [];

    for (const t of teachers) {
        const studentIds = (allGroups?.filter(g => g.teacher_id === t.id) || []).flatMap(g => (g.students as any[] || []).map(s => s.id));
        if (studentIds.length === 0) continue;

        if (!studentIds.some(id => submittedStudents.has(id)) && !alreadyDeducted.has(t.id)) {
            const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.25, 'عدم تسليم التقرير اليومي (أتمتة)', rule.id, 'فحص التقارير اليومية', dateStr, startTime);
            logs.push(...res.logs);
            try {
                const conv = await chatService.getOrCreateConversation(['director', t.id], ['المدير العام', t.full_name], 'director-teacher');
                await chatService.sendMessage(conv.id, 'director', 'المدير العام', 'director', `⚠️ تنبيه آلي: تم خصم ربع يوم لعدم تسليم التقرير ليوم ${DAYS_MAP[dayOfWeek]} ${dateStr}.`);
            } catch (e) {}
        }
    }

    if (logs.length === 0) {
        logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص التقارير اليومية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سلموا التقارير ليوم ${dateStr}`, timestamp: startTime, status: 'success' }));
    }
    return logs;
};

export const checkMissingDailyExams = async (): Promise<AutomationLog[]> => {
    const target = new Date(); target.setDate(target.getDate() - 1);
    const dateStr = normalizeDate(target);
    const dayOfWeek = target.getDay();
    const startTime = new Date();

    if (WEEKEND_DAYS.includes(dayOfWeek)) return [];

    const rules = await getRules();
    const rule = rules.find(r => r.trigger === 'repeated_exams' && r.enabled);
    if (!rule) return [];

    const { data: teachers } = await supabase.from('teachers').select('id, full_name').eq('status', 'active');
    if (!teachers?.length) return [];

    const teacherIds = teachers.map(t => t.id);
    const [ { data: allGroups }, { data: allExams }, { data: allDeductions } ] = await Promise.all([
        supabase.from('groups').select('teacher_id, students(id)').in('teacher_id', teacherIds),
        supabase.from('exams').select('student_id').gte('date', `${dateStr}T00:00:00`).lte('date', `${dateStr}T23:59:59`),
        supabase.from('deductions').select('teacher_id, reason').in('teacher_id', teacherIds).eq('date', dateStr).eq('applied_by', 'system-automation')
    ]);

    const examStudents = new Set(allExams?.map(e => e.student_id));
    const alreadyDeducted = new Set(allDeductions?.map(d => d.teacher_id));
    const logs = [];

    for (const t of teachers) {
        const studentIds = (allGroups?.filter(g => g.teacher_id === t.id) || []).flatMap(g => (g.students as any[] || []).map(s => s.id));
        if (studentIds.length === 0) continue;

        if (!studentIds.some(id => examStudents.has(id)) && !alreadyDeducted.has(t.id)) {
            const res = await executeDeduction(t.id, t.full_name, rule.condition.deductionAmount || 0.25, 'عدم تسجيل الاختبارات الأسبوعية', rule.id, 'فحص الاختبارات الأسبوعية', dateStr, startTime);
            logs.push(...res.logs);
            try {
                const conv = await chatService.getOrCreateConversation(['director', t.id], ['المدير العام', t.full_name], 'director-teacher');
                await chatService.sendMessage(conv.id, 'director', 'المدير العام', 'director', `⚠️ تنبيه آلي: تم خصم ربع يوم لعدم تسليم الاختبارات ليوم ${DAYS_MAP[dayOfWeek]} ${dateStr}.`);
            } catch (e) {}
        }
    }

    if (logs.length === 0) {
        logs.push(await addLog({ ruleId: rule.id, ruleName: 'فحص الاختبارات الأسبوعية', triggeredBy: 'system', recipientId: 'system', recipientName: '✅ التزام كامل', messageSent: `الجميع سجلوا اختبارات ليوم ${dateStr}`, timestamp: startTime, status: 'success' }));
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

export const sendManualNotification = async (tId: string, tName: string, amt: number, type: string, note: string, sender?: any) => {
    const sId = sender?.uid || 'director', sName = sender?.displayName || 'المدير العام';
    const conv = await chatService.getOrCreateConversation([sId, tId], [sName, tName], 'director-teacher');
    await chatService.sendMessage(conv.id, sId, sName, 'director', `تنبيه إداري: تم تسجيل ${type === 'reward' ? 'مكافأة' : 'خصم'} بقيمة ${amt}.\nالبيان: ${note}`);
};

// ==========================================
// 5. التصدير النهائي
// ==========================================

export const automationService = {
    getRules, getLogs, createRule, updateRule, deleteRule, toggleRule, triggerAutomation,
    checkMissingDailyReports, checkMissingDailyExams, executeDeduction, undoAutomationDeduction, sendManualNotification, addLog
};