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

  // ✅ 3 requests only (regardless of how many months selected)
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['finance-comparison-raw', recentMonths[0]?.value, recentMonths[recentMonths.length - 1]?.value],
    staleTime: 1000 * 60 * 15,   // 15 دقيقة - لا يعيد التحميل تلقائياً
    gcTime: 1000 * 60 * 60,      // يبقى في الـ cache لساعة كاملة
    retry: 1,                    // محاولة إعادة واحدة فقط عند الفشل
    queryFn: async () => {
      const firstMonth = recentMonths[0].value;
      const lastMonth = recentMonths[recentMonths.length - 1].value;

      // Start/end dates for the entire range
      const startDate = `${firstMonth}-01`;
      const [ly, lm] = lastMonth.split('-').map(Number);
      const lastDay = new Date(ly, lm, 0).getDate();
      const endDate = `${lastMonth}-${String(lastDay).padStart(2, '0')}`;

      // === 3 parallel requests for ALL months at once ===
      const [txResult, feesResult, exemptResult] = await Promise.all([
        // 1. All transactions in the date range
        supabase
          .from('financial_transactions')
          .select('id, type, category, amount, date, performed_by, related_user_id')
          .gte('date', startDate)
          .lte('date', endDate),

        // 2. All fees in the month range (using .in for all month values & full labels)
        supabase
          .from('fees')
          .select('id, student_id, month, amount, created_by')
          .in('month', [
            ...recentMonths.map(m => m.value),
            ...recentMonths.map(m => m.fullLabel)
          ]),

        // 3. All exemptions
        supabase
          .from('free_exemptions')
          .select('id, student_id, month, amount')
          .in('month', recentMonths.map(m => m.value))
      ]);

      return {
        transactions: txResult.data || [],
        fees: feesResult.data || [],
        exemptions: exemptResult.data || []
      };
    },
    enabled: teachers.length > 0 && students.length > 0 && groups.length > 0 && recentMonths.length > 0
  });

  // All calculation is local (no network)
  const chartData = useMemo<MonthlyData[]>(() => {
    if (!rawData) return [];

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

    const { transactions, fees, exemptions } = rawData;

    return recentMonths.map(m => {
      // Filter transactions for this month
      const monthTx = transactions.filter(tr => (tr.date as string).startsWith(m.value));
      const incomeTx = monthTx.filter(tr => tr.type === 'income');
      const expenseTx = monthTx.filter(tr => tr.type === 'expense');

      // Filter fees for this month (support both YYYY-MM & fullLabel formats)
      const monthFees = fees.filter(f => f.month === m.value || f.month === m.fullLabel);

      // Deduplicate fees
      const seenFees = new Set<string>();
      const allFees = monthFees.filter(f => {
        if (seenFees.has(f.id)) return false;
        seenFees.add(f.id);
        return true;
      });

      // Manager direct fees
      const totalFeesByManagerDirect = allFees
        .filter(fee => {
          const isByTeacher = teachers.some(t =>
            fee.created_by === t.fullName ||
            fee.created_by === t.phone ||
            (fee.created_by && normalize(fee.created_by) === normalize(t.fullName))
          );
          const isExplicitManager = fee.created_by === user?.displayName || fee.created_by === 'المدير' || fee.created_by === 'admin';
          const isNotTeacher = !isByTeacher && fee.created_by && fee.created_by !== 'غير معروف';
          return isExplicitManager || isNotTeacher;
        })
        .reduce((sum, fee) => sum + (Number(String(fee.amount).replace(/[^0-9.]/g, '')) || 0), 0);

      const totalFromTeachers = incomeTx
        .filter(tr => tr.category === 'تحصيل من مدرس')
        .reduce((sum, tr) => sum + Number(tr.amount), 0);

      const totalOtherIncome = incomeTx
        .filter(tr => tr.category === 'donation' || tr.category === 'other')
        .reduce((sum, tr) => sum + Number(tr.amount), 0);

      const managerTotal = totalFeesByManagerDirect + totalFromTeachers + totalOtherIncome;
      const totalExp = expenseTx.reduce((sum, tr) => sum + Number(tr.amount), 0);

      // Deficit
      const monthExemptions = exemptions.filter(e => e.month === m.value);
      const exemptedStudentIds = new Set(monthExemptions.map((e: any) => e.student_id));

      let totalDeficit = 0;
      teachers.forEach(t => {
        if (t.status === 'active' || !t.status) {
          const teacherGroups = groups.filter(g => g.teacherId === t.id).map(g => g.id);
          const teacherStudents = students.filter(s => {
            if (!s.groupId || !teacherGroups.includes(s.groupId) || s.status === 'archived') return false;
            if (s.enrollmentDate) return s.enrollmentDate.substring(0, 7) <= m.value;
            return true;
          });
          teacherStudents.forEach(student => {
            const studentFees = allFees.filter(f => f.student_id === student.id);
            const totalPaid = studentFees.reduce((sum, f) => sum + (Number(String(f.amount).replace(/[^0-9.]/g, '')) || 0), 0);
            const expected = Number(student.monthlyAmount) || 0;
            const remaining = Math.max(0, expected - totalPaid);
            if (remaining > 0 && !exemptedStudentIds.has(student.id)) {
              totalDeficit += remaining;
            }
          });
        }
      });

      return {
        month: m.value,
        label: m.label,
        income: managerTotal,
        expenses: totalExp,
        balance: managerTotal - totalExp,
        deficit: totalDeficit
      };
    });
  }, [rawData, recentMonths, teachers, students, groups, user?.displayName]);

  // Transpose: X-axis = metric, bars = months
  const transposedData = useMemo(() => {
    if (!chartData.length) return [];
    const rows: Record<string, any>[] = [
      { metric: 'الإيرادات' },
      { metric: 'المصروفات' },
      { metric: 'العجز' },
      { metric: 'الربح' },
    ];
    chartData.forEach(d => {
      rows[0][d.label] = d.income;
      rows[1][d.label] = d.expenses;
      rows[2][d.label] = d.deficit;
      rows[3][d.label] = d.balance;
    });
    return rows;
  }, [chartData]);

  const monthColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
    "#06B6D4", "#84CC16", "#EAB308", "#6366F1"
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

      <div className="w-full pb-4">
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
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }}
              dx={-10}
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #F3F4F6',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                direction: 'rtl',
                textAlign: 'right'
              }}
              formatter={(value: any, name: any) => [`${(value || 0).toLocaleString()} ج.م`, name]}
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
                animationDuration={1200}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
