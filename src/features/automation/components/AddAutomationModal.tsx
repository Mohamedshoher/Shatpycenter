'use client';

import { useState } from 'react';
import type { AutomationRule } from '@/features/automation/services/automationService';
import { X } from 'lucide-react';

interface AddAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => void;
}

const triggerTypes = [
  { value: 'deduction', label: 'خصم من الراتب' },
  { value: 'absence', label: 'غياب متكرر' },
  { value: 'payment_due', label: 'رسوم مستحقة' },
  { value: 'low_grade', label: 'درجات منخفضة' },
  { value: 'missing_daily_report', label: 'عدم تسليم التقرير اليومي' },
];

export const AddAutomationModal: React.FC<AddAutomationModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationRule['trigger']>('deduction');
  const [amount, setAmount] = useState('');
  const [template, setTemplate] = useState('');
  const [recipients, setRecipients] = useState<('teacher' | 'parent')[]>(['teacher']);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const handleRecipientToggle = (recipient: 'teacher' | 'parent') => {
    setRecipients((prev) =>
      prev.includes(recipient)
        ? prev.filter((r) => r !== recipient)
        : [...prev, recipient]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rule: Omit<AutomationRule, 'id' | 'createdAt'> = {
      name,
      trigger,
      recipients,
      schedule: {
        time: scheduleTime,
        frequency: scheduleFrequency,
      },
      condition: { amount: Number(amount) },
      action: {
        type: 'send_message',
        messageTemplate: template,
      },
      enabled: true,
    };

    onAdd(rule);
    setName('');
    setAmount('');
    setTemplate('');
    setRecipients(['teacher']);
    setScheduleTime('12:00');
    setScheduleFrequency('daily');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">إضافة قاعدة أتمتة</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
              اسم القاعدة
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: إشعار الخصم"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
              نوع التفعيل
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as AutomationRule['trigger'])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            >
              {triggerTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount/Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
              {trigger === 'deduction' ? 'المبلغ الأدنى (ريال)' : 'الحد الأدنى'}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            />
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
              نص الرسالة
            </label>
            <div className="bg-blue-50 p-3 rounded-lg mb-2 text-xs text-blue-700 text-right">
              استخدم المتغيرات مثل: amount و date و studentName للإحلال التلقائي
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="مثال: تم خصم {{amount}} ريال من راتبك بتاريخ {{date}}"
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
              المتلقون
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRecipientToggle('teacher')}
                className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  recipients.includes('teacher')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700'
                }`}
              >
                👨‍🏫 معلمون
              </button>
              <button
                type="button"
                onClick={() => handleRecipientToggle('parent')}
                className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  recipients.includes('parent')
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700'
                }`}
              >
                👨‍👩‍👧 أولياء أمور
              </button>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
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
              <label className="block text-sm font-medium text-gray-900 mb-2 text-right">
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

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              إضافة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
