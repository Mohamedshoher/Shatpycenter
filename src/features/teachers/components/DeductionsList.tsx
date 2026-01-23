'use client';

import { TeacherDeduction } from '@/features/teachers/services/deductionService';
import { Trash2, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DeductionsListProps {
  deductions: TeacherDeduction[];
  onRemove?: (id: string) => void;
  showTeacherName?: boolean;
}

export const DeductionsList: React.FC<DeductionsListProps> = ({
  deductions,
  onRemove,
  showTeacherName = false,
}) => {
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  if (deductions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>لا توجد خصومات</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-200">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-sm text-red-600 font-medium">إجمالي الخصومات</p>
            <p className="text-2xl font-bold text-red-700">
              {totalDeductions.toFixed(2)} يوم
            </p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
      </div>

      {/* Deductions List */}
      <div className="space-y-2">
        {deductions.map((deduction) => (
          <div
            key={deduction.id}
            className={`p-4 rounded-lg border-l-4 ${
              deduction.status === 'applied'
                ? 'border-l-red-500 bg-red-50'
                : 'border-l-yellow-500 bg-yellow-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 text-right">
                {showTeacherName && (
                  <p className="font-semibold text-gray-900 mb-1">
                    {deduction.teacherName}
                  </p>
                )}
                <p className="text-sm text-gray-700 font-medium mb-2">
                  {deduction.reason}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(deduction.appliedDate), 'dd MMMM yyyy HH:mm', {
                      locale: ar,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xl font-bold text-red-600">
                  -{deduction.amount}
                </span>
                {onRemove && deduction.status === 'applied' && (
                  <button
                    onClick={() => onRemove(deduction.id)}
                    className="p-1 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                    title="حذف الخصم"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
