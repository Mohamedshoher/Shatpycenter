import { supabase } from '@/lib/supabase';
// Removed circular import

// Teacher deduction tracking service
export interface TeacherDeduction {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number; // 0.25, 0.5, 1 (days)
  reason: string;
  appliedDate: Date;
  appliedBy: string;
  status: 'applied' | 'pending' | 'appealed';
  notes?: string;
}

export const teacherDeductionService = {
  // Get deductions for a specific teacher
  getTeacherDeductions: async (teacherId: string): Promise<TeacherDeduction[]> => {
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*, teachers(full_name)')
        .eq('teacher_id', teacherId)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching teacher deductions:", error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        teacherId: row.teacher_id,
        teacherName: row.teachers?.full_name || 'Unknown',
        amount: Number(row.amount),
        reason: row.reason,
        appliedDate: new Date(row.date), // Using date as appliedDate
        appliedBy: row.applied_by || 'system',
        status: row.status || 'applied',
        notes: row.notes
      }));
    } catch (error) {
      console.error("Unexpected error fetching teacher deductions:", error);
      return [];
    }
  },

  // Get all deductions
  getAllDeductions: async (): Promise<TeacherDeduction[]> => {
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*, teachers(full_name)')
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching all deductions:", error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        teacherId: row.teacher_id,
        teacherName: row.teachers?.full_name || 'Unknown',
        amount: Number(row.amount),
        reason: row.reason,
        appliedDate: new Date(row.date),
        appliedBy: row.applied_by || 'system',
        status: row.status || 'applied',
        notes: row.notes
      }));
    } catch (error) {
      console.error("Unexpected error fetching all deductions:", error);
      return [];
    }
  },

  // Apply deduction automatically or manually
  applyDeduction: async (
    teacherId: string,
    teacherName: string,
    amount: number,
    reason: string,
    appliedBy: string = 'system'
  ): Promise<TeacherDeduction> => {
    try {
      const dateStr = new Date().toISOString().split('T')[0]; // Current date

      const { data, error } = await supabase
        .from('deductions')
        .insert([{
          teacher_id: teacherId,
          date: dateStr,
          amount: amount,
          reason: reason,
          applied_by: appliedBy,
          status: 'applied',
          is_automatic: appliedBy === 'system'
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        teacherId,
        teacherName, // Kept passed value for return, though DB relation exists
        amount: Number(data.amount),
        reason: data.reason,
        appliedDate: new Date(data.date),
        appliedBy: data.applied_by,
        status: data.status,
        notes: data.notes
      };
    } catch (error) {
      console.error("Error applying deduction:", error);
      throw error;
    }
  },

  // Update deduction status
  updateDeductionStatus: async (
    deductionId: string,
    status: 'applied' | 'pending' | 'appealed',
    notes?: string
  ): Promise<void> => {
    try {
      const updates: any = { status };
      if (notes) updates.notes = notes;

      const { error } = await supabase
        .from('deductions')
        .update(updates)
        .eq('id', deductionId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating deduction status:", error);
      throw error;
    }
  },

  // Remove deduction (appeals)
  removeDeduction: async (deductionId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deductionId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting deduction:", error);
      throw error;
    }
  },

  // Calculate total deductions for a teacher
  calculateTotalDeductions: async (teacherId: string): Promise<number> => {
    const deductions = await teacherDeductionService.getTeacherDeductions(teacherId);
    return deductions
      .filter(d => d.status === 'applied')
      .reduce((sum, d) => sum + d.amount, 0);
  },

  // Get monthly deductions for a teacher
  getMonthlyDeductions: async (teacherId: string, year: number, month: number): Promise<TeacherDeduction[]> => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('deductions')
        .select('*, teachers(full_name)')
        .eq('teacher_id', teacherId)
        .gte('date', startDate)
        .lt('date', endDate);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        teacherId: row.teacher_id,
        teacherName: row.teachers?.full_name || 'Unknown',
        amount: Number(row.amount),
        reason: row.reason,
        appliedDate: new Date(row.date),
        appliedBy: row.applied_by,
        status: row.status,
        notes: row.notes
      }));
    } catch (error) {
      console.error("Error fetching monthly deductions:", error);
      return [];
    }
  },

  // Get deduction statistics
  getDeductionStats: async (): Promise<{ teacher: string; totalDays: number }[]> => {
    const deductions = await teacherDeductionService.getAllDeductions();
    const stats: { [key: string]: { name: string; total: number } } = {};

    deductions.forEach((deduction) => {
      if (deduction.status === 'applied') {
        if (!stats[deduction.teacherId]) {
          stats[deduction.teacherId] = {
            name: deduction.teacherName,
            total: 0,
          };
        }
        stats[deduction.teacherId].total += deduction.amount;
      }
    });

    return Object.values(stats).map((s) => ({
      teacher: s.name,
      totalDays: s.total,
    }));
  },

  // Check if deduction already applied for a specific date
  hasDeductionForDate: async (teacherId: string, date: Date): Promise<boolean> => {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('deductions')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('date', dateStr)
        .limit(1);

      if (error) return false;
      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking deduction for date:", error);
      return false;
    }
  }
};

