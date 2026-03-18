import { supabase } from '@/lib/supabase';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { chatService } from '@/features/chat/services/chatService';

// ==========================================
// 1. التعريفات والأنواع (Interfaces)
// ==========================================

export interface AutomationRule {
    id: string;
    name: string;
    trigger: 'deduction' | 'absence' | 'payment_due' | 'low_grade' | 'missing_daily_report' | 'repeated_absence' | 'repeated_exams' | 'overdue_fees';
    recipients: ('teacher' | 'parent')[];
    schedule?: {
        time?: string; // بصيغة HH:mm
        frequency?: 'daily' | 'weekly' | 'monthly';
    };
    condition: {
        amount?: number;
        absenceCount?: number;
        daysBeforeDue?: number;
        gradeThreshold?: number;
        checkTime?: string;
        deductionAmount?: number;
    };
    action: {
        type: 'send_message' | 'apply_deduction';
        messageTemplate: string;
    };
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
// 2. القواعد الافتراضية للتهيئة
// ==========================================

const DEFAULT_RULES: Omit<AutomationRule, 'id'>[] = [
    {
        name: 'خصم ربع يوم لعدم تسليم التقرير اليومي',
        trigger: 'missing_daily_report',
        recipients: ['teacher'],
        schedule: { time: '12:30', frequency: 'daily' },
        condition: { checkTime: '12:30', deductionAmount: 0.25 },
        action: {
            type: 'apply_deduction',
            messageTemplate: 'تم خصم ربع يوم - لم تسلم تقرير الحضور والغياب بتاريخ {{date}}',
        },
        enabled: true,
        createdAt: new Date('2026-01-20'),
    }
];

// ==========================================
// 3. خدمات إدارة القواعد (CRUD)
// ==========================================

export const getRules = async (): Promise<AutomationRule[]> => {
    try {
        const { data, error } = await supabase.from('automation_rules').select('*');

        if ((!data || data.length === 0) && !error) {
            const addedRules: AutomationRule[] = [];
            for (const rule of DEFAULT_RULES) {
                const { data: newRule, error: insertError } = await supabase
                    .from('automation_rules')
                    .insert([{
                        name: rule.name,
                        type: rule.trigger,
                        is_active: rule.enabled,
                        conditions: rule.condition,
                        actions: rule.action,
                        recipients: rule.recipients,
                        schedule: rule.schedule,
                        created_at: rule.createdAt
                    }])
                    .select().single();

                if (newRule && !insertError) {
                    addedRules.push({
                        id: newRule.id,
                        name: newRule.name,
                        trigger: newRule.type,
                        recipients: newRule.recipients || [],
                        schedule: newRule.schedule,
                        condition: newRule.conditions,
                        action: newRule.actions,
                        enabled: newRule.is_active,
                        createdAt: new Date(newRule.created_at)
                    });
                }
            }
            return addedRules;
        }

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            name: row.name,
            trigger: row.type as any,
            recipients: row.recipients || [],
            schedule: row.schedule,
            condition: row.conditions,
            action: row.actions,
            enabled: row.is_active,
            createdAt: new Date(row.created_at)
        }));
    } catch (error: any) {
        console.error("Error fetching rules:", error.message);
        return [];
    }
};

export const createRule = async (rule: Omit<AutomationRule, 'id' | 'createdAt'>): Promise<AutomationRule> => {
    const { data, error } = await supabase.from('automation_rules').insert([{
        name: rule.name,
        type: rule.trigger,
        is_active: rule.enabled,
        conditions: rule.condition,
        actions: rule.action,
        recipients: rule.recipients,
        schedule: rule.schedule
    }]).select().single();
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        trigger: data.type,
        recipients: data.recipients,
        schedule: data.schedule,
        condition: data.conditions,
        action: data.actions,
        enabled: data.is_active,
        createdAt: new Date(data.created_at)
    };
};

export const updateRule = async (id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.trigger) dbUpdates.type = updates.trigger;
    if (updates.enabled !== undefined) dbUpdates.is_active = updates.enabled;
    if (updates.condition) dbUpdates.conditions = updates.condition;
    if (updates.action) dbUpdates.actions = updates.action;
    if (updates.recipients) dbUpdates.recipients = updates.recipients;
    if (updates.schedule) dbUpdates.schedule = updates.schedule;

    const { error } = await supabase.from('automation_rules').update(dbUpdates).eq('id', id);
    if (error) throw error;
    const rules = await getRules();
    return rules.find(r => r.id === id)!;
};

export const deleteRule = async (id: string): Promise<void> => {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) throw error;
};

export const toggleRule = async (id: string): Promise<AutomationRule> => {
    const rules = await getRules();
    const rule = rules.find(r => r.id === id);
    if (!rule) throw new Error("Rule not found");
    const { error } = await supabase.from('automation_rules').update({ is_active: !rule.enabled }).eq('id', id);
    if (error) throw error;
    return { ...rule, enabled: !rule.enabled };
};

// ==========================================
// 4. خدمات السجلات (Logging)
// ==========================================

export const getLogs = async (logLimit: number = 20): Promise<AutomationLog[]> => {
    const { data, error } = await supabase.from('automation_logs').select('*').order('triggered_at', { ascending: false }).limit(logLimit);
    if (error) return [];
    return (data || []).map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        triggeredBy: 'system',
        recipientId: row.affected_entity_id,
        recipientName: row.affected_entity_name,
        messageSent: row.details,
        timestamp: new Date(row.triggered_at),
        status: row.status as 'success' | 'failed'
    }));
};

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
        id: data.id,
        ruleId: data.rule_id,
        ruleName: data.rule_name,
        triggeredBy: 'system',
        recipientId: data.affected_entity_id,
        recipientName: data.affected_entity_name,
        messageSent: data.details,
        timestamp: new Date(data.triggered_at),
        status: data.status
    };
};

// ==========================================
// 5. محرك الأتمتة الرئيسي (المحسّن)
// ==========================================

/**
 * فحص التقارير المفقودة - النسخة السريعة (Bulk Fetching)
 */
export const checkMissingDailyReports = async (): Promise<AutomationLog[]> => {
    const logsCreated: AutomationLog[] = [];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    const targetDateStr = targetDate.toLocaleDateString('en-CA');
    const dayOfWeek = targetDate.getDay();

    // 1. تخطي العطلات (الخميس والجمعة)
    if (dayOfWeek === 4 || dayOfWeek === 5) return [];

    // 2. التحقق من وجود القاعدة وتفعيلها
    const rules = await getRules();
    const rule = rules.find(r => r.trigger === 'missing_daily_report' && r.enabled);
    if (!rule) return [];

    // 3. جلب المعلمين النشطين
    const { data: teachers, error: teachersError } = await supabase
        .from('teachers').select('id, full_name').eq('status', 'active');
    if (teachersError || !teachers || teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);

    // -----------------------------------------------------------------
    // الخطوة الأهم للسرعة: جلب كل البيانات المطلوبة دفعة واحدة خارج الحلقة
    // -----------------------------------------------------------------
    const [
        { data: allTeacherAttendance },
        { data: allDeductions },
        { data: allGroups },
        { data: allStudentAttendance }
    ] = await Promise.all([
        supabase.from('teacher_attendance').select('id, teacher_id, status').in('teacher_id', teacherIds).eq('date', targetDateStr),
        supabase.from('deductions').select('id, teacher_id').in('teacher_id', teacherIds).eq('date', targetDateStr),
        supabase.from('groups').select('id, teacher_id, students(id)').in('teacher_id', teacherIds),
        supabase.from('attendance').select('student_id').eq('date', targetDateStr)
    ]);

    // تحويل البيانات لخرائط (Maps) للبحث السريع جداً
    const teacherAttendanceMap = new Map(allTeacherAttendance?.map(a => [a.teacher_id, a]));
    const teacherDeductionMap = new Set(allDeductions?.map(d => d.teacher_id));
    const submittedStudentIds = new Set(allStudentAttendance?.map(a => a.student_id));

    const senderId = 'director';
    const senderName = 'المدير العام';
    const daysMap = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = daysMap[dayOfWeek];

    // 4. معالجة المعلمين داخل الحلقة (سريعة لأنها في الذاكرة)
    for (const teacher of teachers) {
        // فحص الطلاب المسجلين لهذا المعلم
        const teacherGroups = allGroups?.filter(g => g.teacher_id === teacher.id) || [];
        const studentIds = teacherGroups.flatMap(g => (g.students as any[] || []).map(s => s.id));

        if (studentIds.length === 0) continue;

        // هل قام المعلم بتحضير أي طالب من طلابه؟
        const hasSubmitted = studentIds.some(id => submittedStudentIds.has(id));

        if (!hasSubmitted) {
            const deductionAmount = rule.condition.deductionAmount || 0.25;
            const existingAtt = teacherAttendanceMap.get(teacher.id);
            const alreadyDeducted = teacherDeductionMap.has(teacher.id);

            // أ. تحديث سجل الحضور في التقويم
            if (existingAtt) {
                if (existingAtt.status !== 'absent' && existingAtt.status !== 'quarter') {
                    await supabase.from('teacher_attendance').update({ status: 'quarter', notes: 'أتمتة: عدم تسليم التقرير' }).eq('id', (existingAtt as any).id);
                }
            } else {
                await supabase.from('teacher_attendance').insert([{ teacher_id: teacher.id, date: targetDateStr, status: 'quarter', notes: 'أتمتة: خصم تلقائي' }]);
            }

            // ب. تنفيذ الخصم المالي وإرسال الرسالة (إذا لم يتم الخصم مسبقاً)
            if (!alreadyDeducted) {
                const res = await executeDeduction(teacher.id, teacher.full_name, deductionAmount, 'خصم ربع يوم لعدم تسليم التقرير اليومي', rule.id);
                logsCreated.push(...res.logs);

                try {
                    const conv = await chatService.getOrCreateConversation([senderId, teacher.id], [senderName, teacher.full_name], 'director-teacher');
                    await chatService.sendMessage(conv.id, senderId, senderName, 'director', `⚠️ تنبيه آلي:\n\nتم خصم ربع يوم لعدم تسليم التقرير اليومي ليوم ${dayName} الموافق ${targetDateStr}.`);
                } catch (e) { console.error("Chat Error:", e); }
            }
        }
    }
    return logsCreated;
};

// ==========================================
// 6. دوال التنفيذ المساعدة
// ==========================================

export const executeDeduction = async (
    teacherId: string,
    teacherName: string,
    amount: number,
    reason: string,
    ruleId?: string
): Promise<{ deduction: any; logs: AutomationLog[] }> => {
    const deduction = await teacherDeductionService.applyDeduction(teacherId, teacherName, amount, reason, 'system-automation');
    const logsCreated: AutomationLog[] = [];

    let effectiveRuleId = ruleId;
    if (!effectiveRuleId) {
        const rules = await getRules();
        effectiveRuleId = rules.find(r => r.trigger === 'missing_daily_report')?.id;
    }

    if (effectiveRuleId) {
        const log = await addLog({
            ruleId: effectiveRuleId,
            ruleName: 'خصم ربع يوم لعدم تسليم التقرير اليومي',
            triggeredBy: 'system',
            recipientId: teacherId,
            recipientName: teacherName,
            messageSent: `تم تطبيق خصم آلي (${amount} يوم) | السبب: ${reason}`,
            timestamp: new Date(),
            status: 'success',
        });
        logsCreated.push(log);
    }
    return { deduction, logs: logsCreated };
};

export const sendManualNotification = async (
    teacherId: string,
    teacherName: string,
    amount: number,
    type: 'reward' | 'deduction',
    note: string,
    sender?: { uid: string; displayName: string }
): Promise<void> => {
    try {
        const sId = sender?.uid || 'director';
        const sName = sender?.displayName || 'المدير العام';
        const title = type === 'reward' ? '🌟 مكافأة إدارية' : '⚠️ تنبيه إداري';
        const unit = amount <= 5 ? 'يوم' : 'ج.م';

        const conv = await chatService.getOrCreateConversation([sId, teacherId], [sName, teacherName], 'director-teacher');
        await chatService.sendMessage(conv.id, sId, sName, 'director', `${title}:\n\nتم تسجيل ${type === 'reward' ? 'مكافأة' : 'خصم'} بقيمة ${amount} ${unit}.\nالبيان: ${note || 'بدون سبب'}`);
    } catch (error) { console.error("Failed to send notification:", error); }
};

export const triggerAutomation = async (ruleId: string, recipientId: string, recipientName: string, data: Record<string, any>): Promise<AutomationLog> => {
    const rules = await getRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) throw new Error("Rule not found");

    let message = rule.action.messageTemplate;
    Object.entries(data).forEach(([key, value]) => { message = message.replace(`{{${key}}}`, String(value)); });

    return await addLog({
        ruleId, ruleName: rule.name, triggeredBy: 'system', recipientId, recipientName, messageSent: message, timestamp: new Date(), status: 'success',
    });
};

// ==========================================
// 7. التصدير النهائي
// ==========================================

export const automationService = {
    getRules,
    getLogs,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    triggerAutomation,
    checkMissingDailyReports,
    executeDeduction,
    sendManualNotification
};