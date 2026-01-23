import { useState, useCallback } from 'react';
import {
  TeacherDeduction,
  teacherDeductionService,
} from '@/features/teachers/services/deductionService';

export const useTeacherDeductions = (teacherId?: string) => {
  const [deductions, setDeductions] = useState<TeacherDeduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeductions = useCallback(async () => {
    setLoading(true);
    try {
      const data = teacherId
        ? await teacherDeductionService.getTeacherDeductions(teacherId)
        : await teacherDeductionService.getAllDeductions();
      setDeductions(data);
    } catch (err) {
      setError('خطأ في تحميل الخصومات');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const applyDeduction = useCallback(
    async (
      tId: string,
      tName: string,
      amount: number,
      reason: string
    ) => {
      try {
        const deduction = await teacherDeductionService.applyDeduction(
          tId,
          tName,
          amount,
          reason
        );
        setDeductions((prev) => [...prev, deduction]);
        return deduction;
      } catch (err) {
        setError('خطأ في تطبيق الخصم');
      }
    },
    []
  );

  const removeDeduction = useCallback(async (deductionId: string) => {
    try {
      await teacherDeductionService.removeDeduction(deductionId);
      setDeductions((prev) => prev.filter((d) => d.id !== deductionId));
    } catch (err) {
      setError('خطأ في حذف الخصم');
    }
  }, []);

  return {
    deductions,
    loading,
    error,
    loadDeductions,
    applyDeduction,
    removeDeduction,
  };
};
