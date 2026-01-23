'use client';

import { useState } from 'react';
import type { AutomationRule } from '@/features/automation/services/automationService';
import { X } from 'lucide-react';

interface EditAutomationModalProps {
  isOpen: boolean;
  rule: AutomationRule | null;
  onClose: () => void;
  onSave: (rule: Partial<AutomationRule>) => void;
}

const triggerTypes = [
  { value: 'deduction', label: 'خصم من الراتب' },
  { value: 'repeated_absence', label: 'غياب متكرر' },
  { value: 'overdue_fees', label: 'رسوم مستحقة متأخرة' },
  { value: 'low_grade', label: 'درجات منخفضة' },
  { value: 'missing_daily_report', label: 'عدم تسليم التقرير' },
  { value: 'repeated_exams', label: 'اختبارات متكررة' },
  { value: 'payment_due', label: 'رسوم مستحقة' },
  { value: 'absence', label: 'غياب' },
];

export const EditAutomationModal: React.FC<EditAutomationModalProps> = ({
  isOpen,
  rule,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(rule?.name || '');
  const [selectedRecipients, setSelectedRecipients] = useState<('teacher' | 'parent')[]>(
    rule?.recipients || []
  );
  const [scheduleTime, setScheduleTime] = useState(rule?.schedule?.time || '12:00');
  const [scheduleFrequency, setScheduleFrequency] = useState(
    rule?.schedule?.frequency || 'daily'
  );
  const [template, setTemplate] = useState(rule?.action.messageTemplate || '');

  const handleRecipientToggle = (recipient: 'teacher' | 'parent') => {
    setSelectedRecipients((prev) =>
      prev.includes(recipient)
        ? prev.filter((r) => r !== recipient)
        : [...prev, recipient]
    );
  };

  const handleSave = () => {
    onSave({
      name,
      recipients: selectedRecipients,
      schedule: {
        time: scheduleTime,
        frequency: scheduleFrequency as 'daily' | 'weekly' | 'monthly',
      },
      action: {
        type: 'send_message',
        messageTemplate: template,
      },
    });
    onClose();
  };

  if (!isOpen || !rule) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">تعديل القاعدة</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 text-right">
              اسم القاعدة
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            />
          </div>

          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3 text-right">
              المتلقون
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRecipientToggle('teacher')}
                className={`p-4 rounded-lg border-2 transition-all text-right font-medium ${
                  selectedRecipients.includes('teacher')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-300'
                }`}
              >
                👨‍🏫 المعلمون
              </button>
              <button
                onClick={() => handleRecipientToggle('parent')}
                className={`p-4 rounded-lg border-2 transition-all text-right font-medium ${
                  selectedRecipients.includes('parent')
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-green-300'
                }`}
              >
                👨‍👩‍👧 أولياء الأمور
              </button>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 text-right">
                الوقت
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 text-right">
                التكرار
              </label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
          </div>

          {/* Flow Info */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm font-bold text-blue-900 mb-2">خط السير:</p>
            <ul className="text-sm text-blue-800 space-y-1 text-right">
              <li>✓ المتلقون: {selectedRecipients.length > 0 ? selectedRecipients.map(r => r === 'teacher' ? 'المعلمون' : 'أولياء الأمور').join(' و ') : 'لم يتم اختيار'}</li>
              <li>✓ الوقت: {scheduleTime}</li>
              <li>✓ التكرار: {scheduleFrequency === 'daily' ? 'يومياً' : scheduleFrequency === 'weekly' ? 'أسبوعياً' : 'شهرياً'}</li>
              <li>✓ النوع: {rule.trigger}</li>
            </ul>
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 text-right">
              نص الرسالة
            </label>
            <div className="bg-blue-50 p-3 rounded-lg mb-2 text-xs text-blue-700 text-right">
              استخدم: {'{{studentName}}, {{absenceCount}}, {{score}}, {{date}}, {{dueDate}}'}
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
