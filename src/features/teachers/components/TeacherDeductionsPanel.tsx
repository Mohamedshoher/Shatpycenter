'use client';

import { useEffect, useState } from 'react';
import { useTeacherDeductions } from '@/features/teachers/hooks/useTeacherDeductions';
import { DeductionsList } from '@/features/teachers/components/DeductionsList';
import { Loader, AlertCircle } from 'lucide-react';

export const TeacherDeductionsPanel: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const { deductions, loading, error, loadDeductions, removeDeduction } =
    useTeacherDeductions();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      loadDeductions();
    }
  }, [isClient, loadDeductions]);

  if (!isClient) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
        سجل الخصومات
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : (
        <DeductionsList deductions={deductions} onRemove={removeDeduction} />
      )}
    </div>
  );
};
