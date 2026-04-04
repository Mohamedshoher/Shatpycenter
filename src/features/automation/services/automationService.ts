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
    },
    {
        name: 'خصم ربع يوم لعدم تسجيل اختبار يومي',
        trigger: 'repeated_exams',
        recipients: ['teacher'],
        schedule: { time: '14:00', frequency: 'daily' },
        condition: { checkTime: '14:00', deductionAmount: 0.25 },
        action: {
            type: 'apply_deduction',
            messageTemplate: 'تم خصم ربع يوم - لم تسجل أي اختبار بتاريخ {{date}}',
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

export const getLogs = async (logLimit: number = 500, selectedDateStr?: string): Promise<AutomationLog[]> => {
    let query = supabase
        .from('automation_logs')
        .select('*')
        .order('triggered_at', { ascending: false });

    if (selectedDateStr) {
        // إذا حدد المستخدم تاريخاً، نقوم بجلب سجلات ذلك اليوم فقط (من بداية اليوم لنهايته)
        const startDate = `${selectedDateStr}T00:00:00.000Z`;
        const endDate = `${selectedDateStr}T23:59:59.999Z`;
        query = query.gte('triggered_at', startDate).lte('triggered_at', endDate);
    } else {
        query = query.limit(logLimit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let finalLogs = data;

    // إذا لم يحدد المستخدم تاريخاً، نستمر في السلوك السابق (تصفية أحدث جلسة فحص فقط)
    if (!selectedDateStr) {
        let latestReportTime = 0;
        let latestExamTime = 0;

        for (const log of data) {
            const time = new Date(log.triggered_at).getTime();
            if (log.rule_name.includes('تقرير') && latestReportTime === 0) {
                latestReportTime = time;
            }
            if (log.rule_name.includes('اختبار') && latestExamTime === 0) {
                latestExamTime = time;
            }
        }

        finalLogs = data.filter(log => {
            const time = new Date(log.triggered_at).getTime();
            if (log.rule_name.includes('تقرير')) return Math.abs(time - latestReportTime) < 120000;
            if (log.rule_name.includes('اختبار')) return Math.abs(time - latestExamTime) < 120000;
            return true;
        });
    }

    return finalLogs.map(row => ({
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
    
    // استخدام بناء التاريخ يدوياً لتجنب مشاكل المنطقة الزمنية
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    
    const dayOfWeek = targetDate.getDay();
    const runStartTime = new Date(); // توقيت واحد لكافة سجلات هذه الجلسة

    // 1. تخطي العطلات (الخميس والجمعة)
    if (dayOfWeek === 4 || dayOfWeek === 5) {
        console.log("اليوم المستهدف عطلة (خميس/جمعة). لا توجد تقارير مطلوبة.");
        return [];
    }

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
                const res = await executeDeduction(teacher.id, teacher.full_name, deductionAmount, 'عدم تسليم التقرير اليومي (أتمتة)', rule.id, 'فحص التقارير', targetDateStr, runStartTime);
                logsCreated.push(...res.logs);

                try {
                    const conv = await chatService.getOrCreateConversation([senderId, teacher.id], [senderName, teacher.full_name], 'director-teacher');
                    await chatService.sendMessage(conv.id, senderId, senderName, 'director', `⚠️ تنبيه آلي:\n\nتم خصم ربع يوم لعدم تسليم التقرير اليومي ليوم ${dayName} الموافق ${targetDateStr}.`);
                } catch (e) { console.error("Chat Error:", e); }
            }
        }
    }

    // 5. إذا لم يتم العثور على مخالفات، نسجل "سجل تلخيصي" لضمان ظهور نتيجة الفحص في التاريخ الحالي
    if (logsCreated.length === 0) {
        const summaryLog = await addLog({
            ruleId: rule.id,
            ruleName: 'فحص التقارير اليومية',
            triggeredBy: 'system',
            recipientId: 'system',
            recipientName: '✅ التزام كامل',
            messageSent: `لم يتخلف أحد عن تسليم التقرير ليوم ${dayName} الموافق ${targetDateStr}`,
            timestamp: runStartTime,
            status: 'success'
        });
        logsCreated.push(summaryLog);
    }

    return logsCreated;
};

/**
 * فحص الاختبارات المفقودة - يخصم ربع يوم من كل مدرس لم يسجّل اختباراً اليوم
 */
export const checkMissingDailyExams = async (): Promise<AutomationLog[]> => {
    const logsCreated: AutomationLog[] = [];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    
    // تحويل التاريخ يدوياً لتجنب التلاعب بالمناطق الزمنية
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    
    const dayOfWeek = targetDate.getDay();
    const runStartTime = new Date(); // توقيت واحد لكافة سجلات هذه الجلسة

    // تخطي العطلات (الخميس والجمعة)
    if (dayOfWeek === 4 || dayOfWeek === 5) {
        console.log("اليوم المستهدف عطلة (خميس/جمعة). لا توجد اختبارات مطلوبة.");
        return [];
    }

    // ✅ تأكد من وجود قاعدة الاختبارات في قاعدة البيانات، وأضفها إن لم تكن موجودة
    const { data: existingRules } = await supabase
        .from('automation_rules')
        .select('id, type, is_active')
        .eq('type', 'repeated_exams');

    let rule: AutomationRule | undefined;

    if (!existingRules || existingRules.length === 0) {
        // لا توجد القاعدة — أضفها الآن
        const { data: newRule } = await supabase
            .from('automation_rules')
            .insert([{
                name: 'خصم ربع يوم لعدم تسجيل اختبار يومي',
                type: 'repeated_exams',
                is_active: true,
                conditions: { checkTime: '14:00', deductionAmount: 0.25 },
                actions: { type: 'apply_deduction', messageTemplate: 'تم خصم ربع يوم - لم تسجل أي اختبار بتاريخ {{date}}' },
                recipients: ['teacher'],
                schedule: { time: '14:00', frequency: 'daily' },
                created_at: new Date().toISOString()
            }])
            .select().single();
        if (newRule) {
            rule = {
                id: newRule.id,
                name: newRule.name,
                trigger: 'repeated_exams',
                recipients: ['teacher'],
                schedule: newRule.schedule,
                condition: newRule.conditions,
                action: newRule.actions,
                enabled: true,
                createdAt: new Date(newRule.created_at)
            };
        }
    } else {
        const r = existingRules[0];
        if (!r.is_active) return []; // القاعدة موجودة لكن معطّلة
        const allRules = await getRules();
        rule = allRules.find(ar => ar.trigger === 'repeated_exams');
    }

    if (!rule) return [];

    // جلب المعلمين النشطين
    const { data: teachers, error: teachersError } = await supabase
        .from('teachers').select('id, full_name').eq('status', 'active');
    if (teachersError || !teachers || teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);

    // جلب كل البيانات المطلوبة دفعة واحدة
    const [
        { data: allGroups },
        { data: allExamsToday },
        { data: allDeductionsToday },
        { data: allTeacherAttendance }
    ] = await Promise.all([
        supabase.from('groups').select('id, teacher_id, students(id)').in('teacher_id', teacherIds),
        supabase.from('exams').select('student_id').gte('date', `${targetDateStr}T00:00:00`).lte('date', `${targetDateStr}T23:59:59.999`),
        supabase.from('deductions').select('id, teacher_id, reason').in('teacher_id', teacherIds).eq('date', targetDateStr),
        supabase.from('teacher_attendance').select('id, teacher_id, status').in('teacher_id', teacherIds).eq('date', targetDateStr),
    ]);

    const examStudentIds = new Set(allExamsToday?.map(e => e.student_id) || []);
    const alreadyDeductedForExams = new Set(
        allDeductionsToday?.filter(d => d.reason?.includes('اختبار')).map(d => d.teacher_id) || []
    );
    const teacherAttendanceMap = new Map(allTeacherAttendance?.map(a => [a.teacher_id, a]));

    const senderId = 'director';
    const senderName = 'المدير العام';
    const daysMap = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = daysMap[dayOfWeek];

    for (const teacher of teachers) {
        const teacherGroups = allGroups?.filter(g => g.teacher_id === teacher.id) || [];
        const studentIds = teacherGroups.flatMap(g => (g.students as any[] || []).map(s => s.id));

        if (studentIds.length === 0) continue;

        // هل سجّل المعلم اختباراً لأي طالب من طلابه اليوم؟
        const hasRecordedExam = studentIds.some(id => examStudentIds.has(id));

        if (!hasRecordedExam && !alreadyDeductedForExams.has(teacher.id)) {
            const deductionAmount = rule.condition.deductionAmount || 0.25;
            const existingAtt = teacherAttendanceMap.get(teacher.id);

            // تحديث سجل حضور المعلم
            if (existingAtt) {
                if (existingAtt.status !== 'absent' && existingAtt.status !== 'quarter') {
                    await supabase.from('teacher_attendance')
                        .update({ status: 'quarter', notes: 'أتمتة: عدم تسجيل اختبار يومي' })
                        .eq('id', (existingAtt as any).id);
                }
            } else {
                await supabase.from('teacher_attendance').insert([{
                    teacher_id: teacher.id,
                    date: targetDateStr,
                    status: 'quarter',
                    notes: 'أتمتة: خصم تلقائي - لا اختبار'
                }]);
            }

            // تنفيذ الخصم المالي
            const res = await executeDeduction(
                teacher.id,
                teacher.full_name,
                deductionAmount,
                'عدم تسجيل الاختبارات (أتمتة)',
                rule.id,
                'فحص الاختبارات',
                targetDateStr,
                runStartTime
            );
            logsCreated.push(...res.logs);

            // إرسال رسالة تنبيه
            try {
                const conv = await chatService.getOrCreateConversation(
                    [senderId, teacher.id],
                    [senderName, teacher.full_name],
                    'director-teacher'
                );
                await chatService.sendMessage(
                    conv.id, senderId, senderName, 'director',
                    `⚠️ تنبيه آلي:\n\nالسيد المعلم المكرم،\nنفيدكم أنه تم خصم ربع يوم لعدم تسجيل أي اختبار ليوم ${dayName} الموافق ${targetDateStr}.\nالرجاء الحرص على تسجيل اختبار واحد على الأقل يومياً.`
                );
            } catch (e) { console.error("Chat Error:", e); }
        }
    }

    // إذا لم يتم العثور على مخالفات، نسجل "سجل تلخيصي" لضمان ظهور نتيجة الفحص في التاريخ الحالي
    if (logsCreated.length === 0) {
        const summaryLog = await addLog({
            ruleId: rule.id,
            ruleName: 'فحص الاختبارات اليومية',
            triggeredBy: 'system',
            recipientId: 'system',
            recipientName: '✅ التزام كامل',
            messageSent: `تم تسجيل جميع الاختبارات ليوم ${dayName} الموافق ${targetDateStr}`,
            timestamp: runStartTime,
            status: 'success'
        });
        logsCreated.push(summaryLog);
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
    ruleId?: string,
    ruleName?: string,
    deductionDate?: string, // تاريخ الخصم (أمس مثلاً)
    logTimestamp?: Date // توقيت تسجيل العملية (لربط السجلات بنفس الجلسة)
): Promise<{ deduction: any; logs: AutomationLog[] }> => {
    // الخصم المالي سيظهر فيه "البيان" الممرر في المتغير reason
    // نستخدم التاريخ الممرر أو تاريخ اليوم افتراضياً
    const deduction = await teacherDeductionService.applyDeduction(teacherId, teacherName, amount, reason, 'system-automation', deductionDate);
    const logsCreated: AutomationLog[] = [];

    let effectiveRuleId = ruleId;
    if (!effectiveRuleId) {
        const rules = await getRules();
        effectiveRuleId = rules.find(r => r.trigger === 'missing_daily_report')?.id;
    }

    if (effectiveRuleId) {
        // نستخدم التوقيت الممرر أو توقية المعلم الحالي
        const finalTimestamp = logTimestamp || new Date();

        const log = await addLog({
            ruleId: effectiveRuleId,
            ruleName: ruleName || (reason.includes('تقرير') ? 'فحص التقارير اليومية' : 'فحص الاختبارات اليومية'),
            triggeredBy: 'system',
            recipientId: teacherId,
            recipientName: teacherName,
            // نخزن تاريخ الخصم المستهدف في بداية الرسالة ليتمكن نظام التراجع (Undo) من استخراجه
            messageSent: `[تاريخ الخصم: ${deductionDate || '--'}] | تم تطبيق خصم تلقائي (${amount} يوم) | السبب: ${reason}`,
            // هام: نستخدم توقيت التشغيل الفعلي في الـ triggered_at لضمان ترتيب السجلات وتصفيتها بشكل صحيح
            timestamp: finalTimestamp,
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

/**
 * إلغاء الخصم الناتج عن عملية أتمتة
 */
export const undoAutomationDeduction = async (logId: string, teacherId: string, timestamp: Date): Promise<void> => {
    // 1. استخراج تاريخ الخصم المستهدف من سجل الأتمتة
    const { data: logEntry } = await supabase.from('automation_logs').select('details').eq('id', logId).single();
    if (!logEntry) throw new Error("Log entry not found");

    // استخراج التاريخ بتنسيق YYYY-MM-DD من الرسالة المخزنة [تاريخ الخصم: 2026-03-28]
    const dateMatch = logEntry.details.match(/\[تاريخ الخصم: (\d{4}-\d{2}-\d{2})\]/);
    const dateStr = dateMatch ? dateMatch[1] : timestamp.toISOString().split('T')[0];

    // 2. البحث عن الخصم في جدول الخصومات
    const { data: deductions, error: dError } = await supabase
        .from('deductions')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('date', dateStr)
        .eq('applied_by', 'system-automation');

    if (dError) throw dError;

    // 2. حذف الخصم إذا وجد
    if (deductions && deductions.length > 0) {
        for (const d of deductions) {
            await teacherDeductionService.removeDeduction(d.id);
        }
    }

    // 3. حذف سجل الأتمتة أو تحديثه
    const { error: lError } = await supabase
        .from('automation_logs')
        .delete()
        .eq('id', logId);

    if (lError) throw lError;

    // 4. حذف سجل الحضور المرتبط من teacher_attendance (اختياري لكن مفضل)
    await supabase.from('teacher_attendance')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('date', dateStr)
        .ilike('notes', '%أتمتة%');
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
    checkMissingDailyExams,
    executeDeduction,
    undoAutomationDeduction,
    sendManualNotification
};