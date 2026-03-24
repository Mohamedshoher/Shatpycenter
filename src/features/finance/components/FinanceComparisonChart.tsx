import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface MonthlyData {
  month: string;
  label: string;
  income: number;
  expenses: number;
  balance: number;
  deficit: number;
}

export default function FinanceComparisonChart() {
  const [monthsCount, setMonthsCount] = useState<number>(3);
  const { user } = useAuthStore();
  const { data: teachers = [] } = useTeachers();
  const { data: students = [] } = useStudents();
  const { data: groups = [] } = useGroups();

  const recentMonths = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('ar-EG', { month: 'short' }),
        fullLabel: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
      });
    }
    return result;
  }, [monthsCount]);

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['finance-comparison', monthsCount, teachers.length, students.length],
    queryFn: async () => {
      const data: MonthlyData[] = [];

      const normalize = (s: string) => {
        if (!s) return '';
        return s
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .replace(/[ءئؤ]/g, '')
          .replace(/[ًٌٍَُِّ]/g, '')
          .replace(/\s+/g, '')
          .trim();
      };

      // Fetch exemptions for all selected months
      const { data: allExemptions = [] } = await supabase
        .from('free_exemptions')
        .select('*')
        .in('month', recentMonths.map(m => m.value));

      for (const m of recentMonths) {
        const [year, month] = m.value.split('-');

        // Fetch transactions & fees concurrently
        const [dbTransactions, feesByKey, feesByLabel] = await Promise.all([
          getTransactionsByMonth(parseInt(year), parseInt(month)),
          getFeesByMonth(m.value),
          getFeesByMonth(m.fullLabel)
        ]);

        // Merge fees
        const seenFees = new Set();
        const allFees = [...feesByKey, ...feesByLabel].filter(f => {
          if (seenFees.has(f.id)) return false;
          seenFees.add(f.id);
          return true;
        });

        // Income transactions
        const incomeTransactions = dbTransactions.filter(tr => tr.type === 'income');
        const expenseTransactions = dbTransactions.filter(tr => tr.type === 'expense');

        // Total received logic (from page.tsx)
        const totalFeesByManagerDirect = allFees
          .filter(fee => {
            const isByTeacher = teachers.some(t =>
              fee.createdBy === t.fullName ||
              fee.createdBy === t.phone ||
              (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName))
            );
            const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
            const isNotTeacher = !isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف';
            return isExplicitManager || isNotTeacher;
          })
          .reduce((sum, fee) => sum + (Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);

        const totalFromTeachers = incomeTransactions
          .filter(tr => tr.category === 'تحصيل من مدرس')
          .reduce((sum, tr) => sum + tr.amount, 0);

        const totalOtherIncome = incomeTransactions
          .filter(tr => tr.category === 'donation' || tr.category === 'other')
          .reduce((sum, tr) => sum + tr.amount, 0);

        const managerTotal = totalFeesByManagerDirect + totalFromTeachers + totalOtherIncome;
        const totalExp = expenseTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        // Calculate Deficit (العجز)
        const monthExemptions = (allExemptions || []).filter(e => e.month === m.value);
        const exemptedStudentIds = monthExemptions.map((e: any) => e.student_id);

        let totalDeficit = 0;

        teachers.forEach(t => {
          if (t.status === 'active' || !t.status) {
            const teacherGroups = groups.filter(g => g.teacherId === t.id).map(g => g.id);
            const teacherStudents = students.filter(s => {
              const isMember = s.groupId && teacherGroups.includes(s.groupId) && s.status !== 'archived';
              if (!isMember) return false;

              if (s.enrollmentDate) {
                const enrollYearMonth = s.enrollmentDate.substring(0, 7);
                return enrollYearMonth <= m.value;
              }
              return true;
            });

            teacherStudents.forEach(student => {
              // Fees for THIS month
              const studentFees = allFees.filter(f => f.studentId === student.id);
              const totalPaidByStudent = studentFees.reduce((sum, f) => sum + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
              const expectedAmount = Number(student.monthlyAmount) || 0;
              const remaining = Math.max(0, expectedAmount - totalPaidByStudent);
              const isExempted = exemptedStudentIds.includes(student.id);

              if (remaining > 0 && !isExempted) {
                totalDeficit += remaining;
              }
            });
          }
        });

        data.push({
          month: m.value,
          label: m.label,
          income: managerTotal,
          expenses: totalExp,
          balance: managerTotal - totalExp,
          deficit: totalDeficit
        });
      }

      return data;
    },
    enabled: teachers.length > 0 && students.length > 0 && groups.length > 0
  });

  const transposedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const incomeRow: any = { metric: 'الإيرادات' };
    const expensesRow: any = { metric: 'المصروفات' };
    const deficitRow: any = { metric: 'إجمالي العجز' };
    const balanceRow: any = { metric: 'صافي الربح' };

    chartData.forEach(d => {
      incomeRow[d.label] = d.income;
      expensesRow[d.label] = d.expenses;
      deficitRow[d.label] = d.deficit;
      balanceRow[d.label] = d.balance;
    });

    return [incomeRow, expensesRow, deficitRow, balanceRow];
  }, [chartData]);

  // A palette of nice vibrant colors for the months
  const monthColors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#14B8A6", // teal
    "#F97316", // orange
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#EAB308", // yellow
    "#6366F1", // indigo
  ];

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-gray-100 rounded-[32px] p-6 shadow-sm">
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-right w-full md:w-auto">
          <h3 className="text-lg font-black text-gray-900">التحليل المالي المقارن</h3>
          <p className="text-xs font-bold text-gray-400 mt-1">
            مقارنة تفصيلية بحسب البند بين الأشهر
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          <div className="px-3 flex items-center gap-2 text-gray-400 shrink-0">
            <Calendar size={16} />
            <span className="text-xs font-bold">الفترة:</span>
          </div>
          {[2, 3, 6, 12].map(count => (
            <button
              key={count}
              onClick={() => setMonthsCount(count)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0",
                monthsCount === count
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
              )}
            >
              {count} أشهر
            </button>
          ))}
        </div>
      </div>

      <div className="h-[400px] w-full relative" dir="ltr">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-400 font-bold text-sm">جاري التحميل...</p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={transposedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="metric"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
              dx={-10}
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #F3F4F6',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                direction: 'rtl',
                textAlign: 'right'
              }}
              formatter={(value: any, name: any) => {
                return [`${(value || 0).toLocaleString()} ج.م`, name];
              }}
              labelStyle={{ color: '#111827', fontWeight: 900, marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '24px' }}
              iconType="circle"
              formatter={(value) => <span className="text-sm font-bold text-gray-700 ml-3">{value}</span>}
            />
            {chartData.map((d, index) => (
              <Bar
                key={d.label}
                name={d.label}
                dataKey={d.label}
                fill={monthColors[index % monthColors.length]}
                radius={[6, 6, 0, 0]}
                barSize={20}
                animationDuration={1500}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
