import { supabase } from '@/lib/supabase';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';

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
    name: 'إشعار الخصم من المعلم',
    trigger: 'deduction',
    recipients: ['teacher'],
    schedule: { time: '12:00', frequency: 'daily' },
    condition: { amount: 0 },
    action: {
      type: 'send_message',
      messageTemplate: 'تم خصم {{amount}} ريال من راتبك. التاريخ: {{date}}',
    },
    enabled: true,
    createdAt: new Date('2026-01-15'),
  },
  {
    name: 'تنبيه الغياب المتكرر',
    trigger: 'repeated_absence',
    recipients: ['teacher', 'parent'],
    schedule: { time: '14:00', frequency: 'daily' },
    condition: { absenceCount: 3 },
    action: {
      type: 'send_message',
      messageTemplate: 'تنبيه: الطالب {{studentName}} غاب {{absenceCount}} مرات',
    },
    enabled: true,
    createdAt: new Date('2026-01-14'),
  },
  {
    name: 'تذكير الرسوم المتأخرة',
    trigger: 'overdue_fees',
    recipients: ['parent'],
    schedule: { time: '10:00', frequency: 'weekly' },
    condition: { daysBeforeDue: 5 },
    action: {
      type: 'send_message',
      messageTemplate: 'تنبيه: الرسوم الدراسية لـ {{studentName}} مستحقة في {{dueDate}}',
    },
    enabled: true,
    createdAt: new Date('2026-01-13'),
  },
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
    name: 'إشعار الاختبارات المتكررة',
    trigger: 'repeated_exams',
    recipients: ['teacher', 'parent'],
    schedule: { time: '16:00', frequency: 'daily' },
    condition: { gradeThreshold: 50 },
    action: {
      type: 'send_message',
      messageTemplate: 'الطالب {{studentName}} حصل على درجة منخفضة في {{examName}}: {{score}}/100',
    },
    enabled: false,
    createdAt: new Date('2026-01-18'),
  },
  {
    name: 'تنبيه الدرجات المنخفضة',
    trigger: 'low_grade',
    recipients: ['parent'],
    schedule: { time: '15:00', frequency: 'weekly' },
    condition: { gradeThreshold: 60 },
    action: {
      type: 'send_message',
      messageTemplate: 'ملاحظة: متوسط درجات {{studentName}} أقل من {{threshold}}%',
    },
    enabled: true,
    createdAt: new Date('2026-01-16'),
  },
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

export const getLogs = async (logLimit: number = 10): Promise<AutomationLog[]> => {
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
  const today = new Date();

  // التحقق من يوم الإجازة (الخميس والجمعة)
  // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 4 || dayOfWeek === 5) {
    console.log("اليوم إجازة (خميس أو جمعة)، تم تخطي فحص الأتمتة.");
    return [];
  }

  // جلب قاعدة الخصم
  const rules = await getRules();
  const rule = rules.find(r => r.trigger === 'missing_daily_report' && r.enabled);

  if (!rule) {
    return logsCreated;
  }

  const todayStr = today.toISOString().split('T')[0];

  // جلب المعلمين النشطين
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, full_name')
    .eq('status', 'active');

  if (!teachers) return [];

  for (const teacher of teachers) {
    // 1. جلب مجموعات المعلم
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('teacher_id', teacher.id);

    if (!groups || groups.length === 0) continue;

    // 2. جلب طلاب هذه المجموعات
    const groupIds = groups.map(g => g.id);
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .in('group_id', groupIds);

    if (!students || students.length === 0) continue;

    // 3. التحقق هل تم تسجيل حضور لأي طالب اليوم
    const studentIds = students.map(s => s.id);
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .in('student_id', studentIds)
      .eq('date', todayStr)
      .limit(1);

    // إذا لم يتم تسجيل حضور
    if (!attendance || attendance.length === 0) {
      // التحقق هل هناك خصم مسجل مسبقاً لهذا اليوم في سجل حضور المعلمين
      const { data: existingEntry } = await supabase
        .from('teacher_attendance')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (!existingEntry) {
        const deductionAmount = rule.condition.deductionAmount || 0.25;

        // أ. تسجيل الخصم في جدول حضور المعلمين (ليظهر في تبويب سجل الحضور)
        await supabase
          .from('teacher_attendance')
          .insert([{
            teacher_id: teacher.id,
            date: todayStr,
            status: 'quarter',
            notes: 'أتمتة: خصم لعدم تسجيل حضور الطلاب'
          }]);

        // ب. تنفيذ الخصم المالي وتسجيل السجلات (Logs)
        const result = await executeDeduction(
          teacher.id,
          teacher.full_name,
          deductionAmount,
          'أتمتة: لم يتم تسجيل حضور/غياب الطلاب اليوم'
        );
        logsCreated.push(...result.logs);
      }
    }
  }

  return logsCreated;
};

export const sendAutomationNotification = async (
  teacherId: string,
  teacherName: string,
  directorId: string,
  directorName: string,
  message: string
): Promise<void> => {
  console.log(`📬 تم إرسال إشعار للمعلم: ${teacherName}`);
  console.log(`📬 تم إرسال إشعار للمدير: ${directorName}`);

  // يمكن إضافة ارسال رسالة فعلية عبر نظام الرسائل
};

// ✨ تطبيق الخصم تلقائياً من نظام الأتمتة
export const executeDeduction = async (
  teacherId: string,
  teacherName: string,
  amount: number,
  reason: string
): Promise<{ deduction: any; logs: AutomationLog[] }> => {
  const deduction = await teacherDeductionService.applyDeduction(
    teacherId,
    teacherName,
    amount,
    reason,
    'system-automation'
  );

  const logsCreated: AutomationLog[] = [];

  // Log 1: للمعلم
  const teacherLog = await addLog({
    ruleId: 'rule-missing-report', // Placeholder ID if rule doesn't exist
    ruleName: 'خصم ربع يوم لعدم تسليم التقرير اليومي',
    triggeredBy: 'system',
    recipientId: teacherId,
    recipientName: teacherName,
    messageSent: `⚠️ تم خصم ${amount} يوم من راتبك. السبب: ${reason}. التاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
    timestamp: new Date(),
    status: 'success',
  });
  logsCreated.push(teacherLog);

  // Log 2: للمدير
  const directorLog = await addLog({
    ruleId: 'rule-missing-report',
    ruleName: 'خصم ربع يوم لعدم تسليم التقرير اليومي',
    triggeredBy: 'system',
    recipientId: 'director-1',
    recipientName: 'مدير المركز',
    messageSent: `✅ تم تطبيق خصم تلقائي على ${teacherName}: خصم ${amount} يوم | السبب: ${reason}`,
    timestamp: new Date(),
    status: 'success',
  });
  logsCreated.push(directorLog);

  return { deduction, logs: logsCreated };
};

// 📋 نفذ قاعدة الأتمتة كاملة
export const executeRule = async (
  ruleId: string,
  teacherId: string,
  teacherName: string,
  data?: Record<string, any>
): Promise<AutomationLog[]> => {
  const rules = await getRules();
  const rule = rules.find(r => r.id === ruleId);
  const logsCreated: AutomationLog[] = [];

  if (!rule || !rule.enabled) {
    return logsCreated;
  }

  // تطبيق الخصم إذا كان نوع الإجراء apply_deduction
  if (rule.action.type === 'apply_deduction' && rule.trigger === 'missing_daily_report') {
    const deductionAmount = rule.condition.deductionAmount || 0.25;
    const { logs } = await executeDeduction(
      teacherId,
      teacherName,
      deductionAmount,
      'لم يسلم التقرير اليومي'
    );
    return logs;
  }

  // إرسال رسالة إذا كان نوع الإجراء send_message
  if (rule.action.type === 'send_message') {
    let message = rule.action.messageTemplate;

    // استبدال المتغيرات
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        message = message.replace(`{{${key}}}`, String(value));
      });
    }

    // إنشاء log للمعلم
    const teacherLog = await addLog({
      ruleId,
      ruleName: rule.name,
      triggeredBy: 'system',
      recipientId: teacherId,
      recipientName: teacherName,
      messageSent: message,
      timestamp: new Date(),
      status: 'success',
    });
    logsCreated.push(teacherLog);

    // إنشاء log للمدير
    const directorLog = await addLog({
      ruleId,
      ruleName: rule.name,
      triggeredBy: 'system',
      recipientId: 'director-1',
      recipientName: 'مدير المركز',
      messageSent: `✅ تم تنفيذ القاعدة على ${teacherName}: ${message}`,
      timestamp: new Date(),
      status: 'success',
    });
    logsCreated.push(directorLog);
  }

  return logsCreated;
};

// للتوافق مع الكود القديم
export const automationService = {
  getRules,
  getLogs,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  triggerAutomation,
  checkMissingDailyReports,
  sendAutomationNotification,
  executeDeduction,
  executeRule
};

