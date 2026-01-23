'use client';

import type { AutomationRule } from '@/features/automation/services/automationService';
import { Trash2, Power, PowerOff, Edit2 } from 'lucide-react';

interface RulesListProps {
  rules: AutomationRule[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (rule: AutomationRule) => void;
}

const triggerLabels: Record<AutomationRule['trigger'], string> = {
  deduction: 'خصم من الراتب',
  absence: 'غياب متكرر',
  payment_due: 'رسوم مستحقة',
  low_grade: 'درجات منخفضة',
  missing_daily_report: 'عدم تسليم التقرير اليومي',
  repeated_absence: 'غياب متكرر للطالب',
  repeated_exams: 'اختبارات متكررة',
  overdue_fees: 'رسوم مستحقة متأخرة',
};

export const RulesList: React.FC<RulesListProps> = ({ rules, onToggle, onDelete, onEdit }) => {
  const getFrequencyLabel = (freq?: string): string => {
    switch (freq) {
      case 'daily': return 'يومياً';
      case 'weekly': return 'أسبوعياً';
      case 'monthly': return 'شهرياً';
      default: return 'يومياً';
    }
  };

  const getRecipientsLabel = (recipients: ('teacher' | 'parent')[]): string => {
    return recipients
      .map(r => r === 'teacher' ? '👨‍🏫 المعلمون' : '👨‍👩‍👧 أولياء الأمور')
      .join(' و ');
  };

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`p-5 rounded-xl border-2 transition-all shadow-sm ${
            rule.enabled
              ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
              : 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100'
          }`}
        >
          {/* Header with status indicator */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    rule.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <h3 className="font-bold text-gray-900 text-lg text-right">
                  {rule.name}
                </h3>
              </div>
              <p className="text-sm text-gray-600 text-right">
                {triggerLabels[rule.trigger]}
              </p>
            </div>
          </div>

          {/* Message Template */}
          <p className="text-sm text-gray-700 text-right mb-4 bg-white/60 p-3 rounded-lg border border-gray-200">
            {rule.action.messageTemplate}
          </p>

          {/* Flow Information */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-right">
            <p className="text-xs font-bold text-blue-900 mb-2">خط السير:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✓ المتلقون: {getRecipientsLabel(rule.recipients)}</li>
              <li>✓ الوقت: {rule.schedule?.time || '--:--'} - {getFrequencyLabel(rule.schedule?.frequency)}</li>
              {rule.trigger === 'deduction' && rule.condition?.deductionAmount && (
                <li>✓ الشرط: خصم {rule.condition.deductionAmount} ريال</li>
              )}
              {rule.trigger === 'repeated_absence' && rule.condition?.absenceCount && (
                <li>✓ الشرط: بعد {rule.condition.absenceCount} غيابات</li>
              )}
              {rule.trigger === 'overdue_fees' && rule.condition?.daysBeforeDue && (
                <li>✓ الشرط: قبل {rule.condition.daysBeforeDue} أيام من الموعد</li>
              )}
              {rule.trigger === 'low_grade' && rule.condition?.gradeThreshold && (
                <li>✓ الشرط: أقل من {rule.condition.gradeThreshold}</li>
              )}
            </ul>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                rule.enabled
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                rule.enabled ? 'bg-green-600' : 'bg-gray-600'
              }`} />
              {rule.enabled ? 'فعّال' : 'معطّل'}
            </span>
            <span className="text-xs text-gray-500">
              آخر تحديث: {new Date(rule.createdAt).toLocaleDateString('ar-SA')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(rule)}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
              تعديل
            </button>

            <button
              onClick={() => onToggle(rule.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-all font-medium flex items-center justify-center gap-2 text-sm ${
                rule.enabled
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {rule.enabled ? (
                <>
                  <PowerOff className="w-4 h-4" />
                  إيقاف
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  تشغيل
                </>
              )}
            </button>

            <button
              onClick={() => onDelete(rule.id)}
              className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </div>
      ))}

      {rules.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">لا توجد قواعس أتمتة</p>
          <p className="text-sm mt-1">أضف قاعدة جديدة للبدء</p>
        </div>
      )}
    </div>
  );
};
