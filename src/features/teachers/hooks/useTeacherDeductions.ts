'use client';

// ==========================================
// 1. الاستيرادات (Imports)
// ==========================================
import { useState, useCallback } from 'react';
import {
  TeacherDeduction,
  teacherDeductionService,
} from '@/features/teachers/services/deductionService';

// ==========================================
// 2. الخطاف المخصص (Custom Hook): إدارة خصومات المعلم
// ==========================================
export const useTeacherDeductions = (teacherId?: string) => {
  
  // --- حالات البيانات (State) ---
  const [deductions, setDeductions] = useState<TeacherDeduction[]>([]); // قائمة الخصومات
  const [loading, setLoading] = useState(false); // حالة التحميل
  const [error, setError] = useState<string | null>(null); // حالة الخطأ

  // ==========================================
  // دوال التحكم (Handlers & Logic)
  // ==========================================

  // 1. دالة جلب/تحميل قائمة الخصومات
  const loadDeductions = useCallback(async () => {
    setLoading(true);
    try {
      // إذا تم تمرير teacherId يجلب خصومات معلم محدد، وإلا يجلب خصومات الجميع
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

  // 2. دالة تطبيق (إضافة) خصم جديد
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
        // تحديث القائمة فوراً بإضافة الخصم الجديد
        setDeductions((prev) => [...prev, deduction]);
        return deduction;
      } catch (err) {
        setError('خطأ في تطبيق الخصم');
      }
    },
    []
  );

  // 3. دالة حذف خصم موجود
  const removeDeduction = useCallback(async (deductionId: string) => {
    try {
      await teacherDeductionService.removeDeduction(deductionId);
      // تحديث القائمة بحذف الخصم المختار
      setDeductions((prev) => prev.filter((d) => d.id !== deductionId));
    } catch (err) {
      setError('خطأ في حذف الخصم');
    }
  }, []);

  // ==========================================
  // إرجاع القيم المتاحة للمكونات
  // ==========================================
  return {
    deductions,
    loading,
    error,
    loadDeductions,
    applyDeduction,
    removeDeduction,
  };
};