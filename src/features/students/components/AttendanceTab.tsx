import { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';

export default function AttendanceTab({ student, records }: any) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const canEditAttendance = user?.role === 'director' || user?.role === 'supervisor';
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());

    // ثوابت التقويم
    const currentYear = currentDisplayDate.getFullYear();
    const currentMonth = currentDisplayDate.getMonth();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 1) % 7;
    const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    // تصفية سجلات الحضور لهذا الشهر فقط
    const attendanceRecordsMap = useMemo(() => {
        const map: Record<number, string> = {};
        records.attendance.forEach((rec: any) => {
            if (rec.month === monthKey) map[rec.day] = rec.status;
        });
        return map;
    }, [records.attendance, monthKey]);

    return (
        <div className="space-y-4">
            {/* التحكم في الشهور */}
            <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-2xl">
                <button onClick={() => setCurrentDisplayDate(new Date(currentYear, currentMonth + 1, 1))} className="text-gray-400 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
                <h3 className="font-bold text-gray-900 text-lg">سجل {monthNames[currentMonth]} {currentYear}</h3>
                <button onClick={() => setCurrentDisplayDate(new Date(currentYear, currentMonth - 1, 1))} className="text-gray-400 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
            </div>

            {/* عرض أيام الأسبوع */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {weekDays.map(day => <span key={day} className="text-[10px] text-gray-400 font-bold">{day}</span>)}
            </div>

            {/* عرض أيام الشهر */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(currentYear, currentMonth, day);
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 4 || dayOfWeek === 5; // الخميس والجمعة
                    const status = attendanceRecordsMap[day];
                    const isFuture = dateObj > new Date();

                    return (
                        <div key={day} 
                            onClick={() => {
                                if (!isFuture && !isWeekend && canEditAttendance) {
                                    records.addAttendance.mutate({
                                        studentId: student.id,
                                        day: day,
                                        month: monthKey,
                                        status: status === 'present' ? 'absent' : 'present'
                                    });
                                }
                            }}
                            className={cn(
                            "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all text-sm font-bold shadow-sm",
                            isFuture ? "bg-gray-50/50 text-gray-200 pointer-events-none" :
                            isWeekend ? "bg-amber-50/50 border-amber-100 text-amber-500/50 cursor-default" :
                            status === 'absent' ? "bg-red-50 border-red-100 text-red-600" :
                            status === 'present' ? "bg-green-50 border-green-100 text-green-600" : "bg-white text-gray-400",
                            !isFuture && !isWeekend && canEditAttendance && "cursor-pointer hover:border-blue-300"
                        )}>
                            <span>{day}</span>
                            {isWeekend ? (
                                <span className="text-[8px] font-black mt-0.5">أجازة</span>
                            ) : (
                                !isFuture && (status === 'absent' ? <XCircle size={14} /> : status === 'present' ? <CheckCircle2 size={14} /> : null)
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* ملخص الإحصائيات */}
            <div className="bg-blue-50/50 p-4 rounded-2xl flex justify-around mt-6 border border-blue-100">
                <div className="text-center">
                    <p className="text-xs text-blue-400 font-black mb-1">حضور</p>
                    <p className="text-2xl font-black text-blue-600">{Object.values(attendanceRecordsMap).filter(s => s === 'present').length}</p>
                </div>
                <div className="text-center border-x-2 border-dashed border-blue-200 px-8">
                    <p className="text-xs text-blue-400 font-black mb-1">غياب</p>
                    <p className="text-2xl font-black text-red-500">{Object.values(attendanceRecordsMap).filter(s => s === 'absent').length}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-blue-400 font-black mb-1">نسبة</p>
                    <p className="text-2xl font-black text-blue-600">
                        {Math.round((Object.values(attendanceRecordsMap).filter(s => s === 'present').length / (Object.keys(attendanceRecordsMap).length || 1)) * 100)}%
                    </p>
                </div>
            </div>
        </div>
    );
}