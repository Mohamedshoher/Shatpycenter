'use client';

import { useState, useEffect } from 'react';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { DeductionsList } from '@/features/teachers/components/DeductionsList';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AlertCircle, Calendar, TrendingDown, Users, Loader } from 'lucide-react';

export default function DisciplineLogPage() {
  const [allDeductions, setAllDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredDeductions, setFilteredDeductions] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // تحميل جميع الخصومات
  useEffect(() => {
    const loadDeductions = async () => {
      setLoading(true);
      try {
        const deductions = await teacherDeductionService.getAllDeductions();
        setAllDeductions(deductions);
        setFilteredDeductions(deductions);
      } catch (error) {
        console.error('خطأ في تحميل الخصومات:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeductions();
  }, []);

  // تطبيق الفلاتر
  useEffect(() => {
    let filtered = allDeductions;

    if (selectedTeacher) {
      filtered = filtered.filter((d) => d.teacherId === selectedTeacher);
    }

    if (selectedMonth) {
      filtered = filtered.filter((d) => {
        const deductionMonth = new Date(d.appliedDate).toISOString().slice(0, 7);
        return deductionMonth === selectedMonth;
      });
    }

    // تصفية حسب الحالة (مطبقة فقط)
    filtered = filtered.filter((d) => d.status === 'applied');

    setFilteredDeductions(filtered);
  }, [selectedTeacher, selectedMonth, allDeductions]);

  // إحصائيات
  const stats = {
    totalDeductions: allDeductions.filter((d) => d.status === 'applied').length,
    totalDays: allDeductions
      .filter((d) => d.status === 'applied')
      .reduce((sum, d) => sum + d.amount, 0),
    uniqueTeachers: new Set(allDeductions.map((d) => d.teacherId)).size,
    filteredTotal: filteredDeductions.reduce((sum, d) => sum + d.amount, 0),
  };

  // الأسباب الشائعة
  const topReasons = (Array.from(
    allDeductions
      .filter((d) => d.status === 'applied')
      .reduce((map, d) => {
        const count = (map.get(d.reason) || 0) + 1;
        map.set(d.reason, count);
        return map;
      }, new Map<string, number>())
      .entries()
  ) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // معلمون فريدون
  const uniqueTeachers = Array.from(
    new Map(allDeductions.map((d) => [d.teacherId, d.teacherName])).entries()
  ).map(([id, name]) => ({ id, name }));

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* الرأس */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900 text-right">سجل الانضباط</h1>
          </div>
          <p className="text-gray-600 text-right">تتبع جميع الخصومات والعقوبات المطبقة على المعلمين</p>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">إجمالي الخصومات</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDeductions}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500/20" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">إجمالي الأيام</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDays.toFixed(2)}</p>
              </div>
              <Calendar className="w-10 h-10 text-orange-500/20" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">عدد المعلمين</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.uniqueTeachers}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500/20" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">الخصومات المعروضة</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{filteredDeductions.length}</p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-500/20" />
            </div>
          </div>
        </div>

        {/* الفلاتر */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 text-right">الفلاتر والبحث</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* فلتر الشهر */}
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* فلتر المعلم */}
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">المعلم</label>
              <select
                value={selectedTeacher || ''}
                onChange={(e) => setSelectedTeacher(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">جميع المعلمين</option>
                {uniqueTeachers.map((teacher: any) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedTeacher(null);
              setSelectedMonth(new Date().toISOString().slice(0, 7));
            }}
            className="w-full md:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>

        {/* قسم الأسباب الشائعة */}
        {topReasons.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 text-right mb-4">أسباب الخصومات الشائعة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topReasons.map(([reason, count], idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-100"
                >
                  <span className="text-sm text-gray-600">{reason}</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-red-500 text-white text-xs font-bold rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
        }

        {/* قائمة الخصومات */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 text-right">
            تفاصيل الخصومات ({filteredDeductions.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filteredDeductions.length > 0 ? (
            <DeductionsList deductions={filteredDeductions} showTeacherName={true} />
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">لا توجد خصومات تطابق معايير البحث</p>
            </div>
          )}
        </div>

        {/* جدول تفصيلي */}
        {
          filteredDeductions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-600">المعلم</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-600">الكمية</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-600">السبب</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-600">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-600">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDeductions.map((deduction) => (
                      <tr key={deduction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 text-right">{deduction.teacherName}</td>
                        <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">
                          {deduction.amount} يوم
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">{deduction.reason}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          {format(new Date(deduction.appliedDate), 'dd MMMM yyyy', { locale: ar })}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            مطبق
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
}
