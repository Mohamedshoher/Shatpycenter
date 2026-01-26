import { supabase } from '@/lib/supabase';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { chatService } from '@/features/chat/services/chatService';

export interface AutomationRule {
    id: string;
    name: string;
    trigger: 'deduction' | 'absence' | 'payment_due' | 'low_grade' | 'missing_daily_report' | 'repeated_absence' | 'repeated_exams' | 'overdue_fees';
    recipients: ('teacher' | 'parent')[];
    schedule?: {
        time?: string; // HH:mm format
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

// القواعد الافتراضية للتهيئة الأولية
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

// ===== خدمات القواعد =====
export const getRules = async (): Promise<AutomationRule[]> => {
    try {
        const { data, error } = await supabase
            .from('automation_rules')
            .select('*');

        // إذا لم توجد قواعد أو الجدول فارغ، أضف القواعد الافتراضية
        if ((!data || data.length === 0) && !error) {
            const addedRules: AutomationRule[] = [];
            for (const rule of DEFAULT_RULES) {
                const { data: newRule, error: insertError } = await supabase
                    .from('automation_rules')
                    .insert([{
                        name: rule.name,
                        type: rule.trigger, // Mapping trigger to type column
                        is_active: rule.enabled,
                        conditions: rule.condition,
                        actions: rule.action,
                        recipients: rule.recipients,
                        schedule: rule.schedule,
                        created_at: rule.createdAt
                    }])
                    .select()
                    .single();

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

        if (error) {
            console.error("Error fetching automation rules from Supabase:", error.message || error);
            return [];
        }

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
        console.error("Unexpected error in getRules:", error.message || error);
        return [];
    }
};

export const getLogs = async (logLimit: number = 20): Promise<AutomationLog[]> => {
    try {
        const { data, error } = await supabase
            .from('automation_logs')
            .select('*')
            .order('triggered_at', { ascending: false })
            .limit(logLimit);

        if (error) {
            console.error("Error fetching automation logs from Supabase:", error.message || error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            ruleId: row.rule_id,
            ruleName: row.rule_name,
            triggeredBy: 'system', // Default
            recipientId: row.affected_entity_id,
            recipientName: row.affected_entity_name,
            messageSent: row.details, // Using details for message
            timestamp: new Date(row.triggered_at),
            status: row.status as 'success' | 'failed'
        }));
    } catch (error: any) {
        console.error("Unexpected error in getLogs:", error.message || error);
        return [];
    }
};

export const createRule = async (rule: Omit<AutomationRule, 'id' | 'createdAt'>): Promise<AutomationRule> => {
    try {
        const { data, error } = await supabase
            .from('automation_rules')
            .insert([{
                name: rule.name,
                type: rule.trigger,
                is_active: rule.enabled,
                conditions: rule.condition,
                actions: rule.action,
                recipients: rule.recipients,
                schedule: rule.schedule
            }])
            .select()
            .single();

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
    } catch (error) {
        console.error("Error creating rule:", error);
        throw error;
    }
};

export const updateRule = async (id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> => {
    try {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.trigger) dbUpdates.type = updates.trigger;
        if (updates.enabled !== undefined) dbUpdates.is_active = updates.enabled;
        if (updates.condition) dbUpdates.conditions = updates.condition;
        if (updates.action) dbUpdates.actions = updates.action;
        if (updates.recipients) dbUpdates.recipients = updates.recipients;
        if (updates.schedule) dbUpdates.schedule = updates.schedule;

        const { error } = await supabase
            .from('automation_rules')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Re-fetch to return full object
        const rules = await getRules();
        return rules.find(r => r.id === id)!;
    } catch (error) {
        console.error("Error updating rule:", error);
        throw error;
    }
};

export const deleteRule = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('automation_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting rule:", error);
        throw error;
    }
};

export const toggleRule = async (id: string): Promise<AutomationRule> => {
    const rules = await getRules();
    const rule = rules.find(r => r.id === id);
    if (!rule) {
        throw new Error("Rule not found");
    }

    const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: !rule.enabled })
        .eq('id', id);

    if (error) throw error;

    return { ...rule, enabled: !rule.enabled };
};

// ===== تسجيل الأحداث =====
export const addLog = async (log: Omit<AutomationLog, 'id'>): Promise<AutomationLog> => {
    try {
        const { data, error } = await supabase
            .from('automation_logs')
            .insert([{
                rule_id: log.ruleId,
                rule_name: log.ruleName,
                triggered_at: log.timestamp.toISOString(), // Assuming timestamp is Date
                status: log.status,
                details: log.messageSent,
                affected_entity_id: log.recipientId,
                affected_entity_name: log.recipientName
            }])
            .select()
            .single();

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
    } catch (error) {
        console.error("Error adding log:", error);
        throw error;
    }
};

// ===== تنفيذ الأتمتة =====
export const triggerAutomation = async (
    ruleId: string,
    recipientId: string,
    recipientName: string,
    data: Record<string, any>
): Promise<AutomationLog> => {
    const rules = await getRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
        throw new Error("Rule not found");
    }

    let message = rule.action.messageTemplate;
    Object.entries(data).forEach(([key, value]) => {
        message = message.replace(`{{${key}}}`, String(value));
    });

    const log: Omit<AutomationLog, 'id'> = {
        ruleId,
        ruleName: rule.name,
        triggeredBy: 'director-1',
        recipientId,
        recipientName,
        messageSent: message,
        timestamp: new Date(),
        status: 'success',
    };

    return await addLog(log);
};

export const checkMissingDailyReports = async (): Promise<AutomationLog[]> => {
    const logsCreated: AutomationLog[] = [];

    // 1. تحديد يوم الفحص (الأمس)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1); // الرجوع يوم واحد للوراء

    const targetDateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

    // التحقق من يوم الإجازة (الخميس والجمعة)
    // 0: Sun, 1: Mon, ...
    const dayOfWeek = targetDate.getDay();

    // إذا كان **أمس** هو الخميس (4) أو الجمعة (5)، نتخطى الفحص
    if (dayOfWeek === 4 || dayOfWeek === 5) {
        console.log(`تاريخ الفحص (${targetDateStr}) يوافق عطلة (خميس/جمعة). تم التخطي.`);
        return [];
    }

    // جلب قاعدة الخصم
    const rules = await getRules();
    const rule = rules.find(r => r.trigger === 'missing_daily_report' && r.enabled);

    if (!rule) {
        console.log("قاعدة الخصم غير مفعلة أو غير موجودة");
        return logsCreated;
    }

    const daysMap = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = daysMap[dayOfWeek];

    // جلب المعلمين النشطين
    const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, full_name') // Removed user_id as it appears to not exist and causes 400 error
        .eq('status', 'active');

    if (teachersError) {
        console.error("Failed to fetch teachers list:", teachersError);
        return [];
    }

    // استخدام معرف 'director' النصي مباشرة ليتطابق مع نظام الدخول الوهمي (Mock Auth)
    // هذا يضمن أن يرى المدير العام المراسلات في شاشة المحادثات الخاصة به
    const senderId = 'director';
    const senderName = 'المدير العام';

    if (!teachers) {
        return [];
    }

    console.log(`بدء فحص التقارير لـ ${teachers.length} معلم للتاريخ ${targetDateStr} (الأمس)`);

    for (const teacher of teachers) {
        console.log(`---> جاري فحص المعلم: ${teacher.full_name} (${teacher.id})`);

        // 1. **التحقق من سجل الحضور**:
        const { data: existingAttendance } = await supabase
            .from('teacher_attendance')
            .select('id, status')
            .eq('teacher_id', teacher.id)
            .eq('date', targetDateStr)
            .maybeSingle();



        // 2. **التحقق من وجود خصم مسبق في جدول deductions**:
        const { data: existingDeduction } = await supabase
            .from('deductions')
            .select('id')
            .eq('teacher_id', teacher.id)
            .eq('date', targetDateStr)
            .maybeSingle();

        if (existingDeduction) {
            console.log(`   - يوجد خصم مالي مسجل في جدول الخصومات. تجاوز.`);
            continue;
        }

        // 3. الفحص الفعلي: هل قام بتحضير طلابه في ذلك اليوم؟
        const { data: groups } = await supabase.from('groups').select('id').eq('teacher_id', teacher.id);
        if (!groups || groups.length === 0) {
            console.log(`   - لا توجد مجموعات لهذا المعلم. تجاوز.`);
            continue;
        }

        const groupIds = groups.map(g => g.id);
        const { data: students } = await supabase.from('students').select('id').in('group_id', groupIds);
        if (!students || students.length === 0) {
            console.log(`   - لا يوجد طلاب في مجموعات المعلم. تجاوز.`);
            continue;
        }

        const studentIds = students.map(s => s.id);
        const { data: attendance } = await supabase
            .from('attendance')
            .select('id')
            .in('student_id', studentIds)
            .eq('date', targetDateStr)
            .limit(1);

        // إذا **لم** نجد أي سجل حضور للطلاب => المعلم لم يسلم التقرير
        if (!attendance || attendance.length === 0) {
            console.log(`   - ❌ مخالفة! لم يسجل حضور للطلاب. جاري تطبيق الخصم...`);

            const deductionAmount = rule.condition.deductionAmount || 0.25;
            const dbReason = 'خصم ربع يوم لعدم تسليم التقرير اليومي';
            const chatDetail = `خصم ربع يوم لعدم تسليم التقرير اليومي ليوم ${dayName} الموافق ${targetDateStr}`;

            // أ. تسجيل/تحديث الخصم في جدول حضور المعلمين
            if (existingAttendance) {
                // تحديث الحالة من "حاضر" إلى "خصم"
                await supabase
                    .from('teacher_attendance')
                    .update({
                        status: 'quarter',
                        notes: 'أتمتة: تم تغيير الحالة لعدم تسليم التقرير رغم التحضير اليدوي'
                    })
                    .eq('id', existingAttendance.id);
            } else {
                // إنشاء سجل جديد
                await supabase
                    .from('teacher_attendance')
                    .insert([{
                        teacher_id: teacher.id,
                        date: targetDateStr,
                        status: 'quarter',
                        notes: 'أتمتة: خصم تلقائي لعدم العمل (فحص الأمس)'
                    }]);
            }

            // ب. تنفيذ الخصم المالي
            const result = await executeDeduction(
                teacher.id,
                teacher.full_name,
                deductionAmount,
                dbReason, // النص المسجل كما طلبه المستخدم
                rule.id
            );
            logsCreated.push(...result.logs);

            // جـ. إرسال رسالة شات
            try {
                if (teacher.id) {
                    const conversation = await chatService.getOrCreateConversation(
                        [senderId, teacher.id],
                        [senderName, teacher.full_name],
                        'director-teacher'
                    );

                    await chatService.sendMessage(
                        conversation.id,
                        senderId,
                        senderName,
                        'director',
                        `⚠️ تنبيه إداري:\n\n${chatDetail}.\nيرجى الالتزام بتسجيل الحضور اليومي للطلاب.`
                    );
                }
            } catch (msgError) {
                console.error(`فشل إرسال رسالة للمعلم ${teacher.full_name}`, msgError);
            }
        } else {
            console.log(`   - ✅ سليم. تم العثور على ${attendance.length} سجل حضور للطلاب.`);
        }
    }

    return logsCreated;
};

export const executeDeduction = async (
    teacherId: string,
    teacherName: string,
    amount: number,
    reason: string,
    ruleId?: string // Optional
): Promise<{ deduction: any; logs: AutomationLog[] }> => {
    const deduction = await teacherDeductionService.applyDeduction(
        teacherId,
        teacherName,
        amount,
        reason,
        'system-automation'
    );

    const logsCreated: AutomationLog[] = [];

    // Try to find a valid rule ID if not provided
    let effectiveRuleId = ruleId;
    if (!effectiveRuleId) {
        const rules = await getRules();
        const defaultRule = rules.find(r => r.trigger === 'missing_daily_report');
        if (defaultRule) {
            effectiveRuleId = defaultRule.id;
        }
    }

    if (effectiveRuleId) {
        try {
            // Log: للمدير فقط أو سجل عام
            const systemLog = await addLog({
                ruleId: effectiveRuleId,
                ruleName: 'خصم ربع يوم لعدم تسليم التقرير اليومي',
                triggeredBy: 'system',
                recipientId: teacherId,
                recipientName: teacherName,
                messageSent: `تم تطبيق خصم آلي (${amount} يوم) | السبب: ${reason}`,
                timestamp: new Date(),
                status: 'success',
            });
            logsCreated.push(systemLog);
        } catch (logError) {
            console.error("Failed to add logs in executeDeduction:", logError);
        }
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
        const senderId = sender?.uid || 'director';
        const senderName = sender?.displayName || 'المدير العام';

        const isReward = type === 'reward';
        const title = isReward ? '🌟 مكافأة إدارية' : '⚠️ تنبيه إداري';

        const message = `${title}:\n\nتم تسجيل ${isReward ? 'مكافأة مالية' : 'خصم مالي'} بقيمة ${amount} ج.م.\nالبيان: ${note || 'بدون سبب'}`;

        const conversation = await chatService.getOrCreateConversation(
            [senderId, teacherId],
            [senderName, teacherName],
            'director-teacher'
        );

        await chatService.sendMessage(
            conversation.id,
            senderId,
            senderName,
            'director',
            message
        );
        console.log(`✅ تم إرسال إشعار ${type} للمعلم ${teacherName} بنجاح.`);
    } catch (error) {
        console.error("Failed to send manual notification:", error);
        throw error;
    }
};

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
