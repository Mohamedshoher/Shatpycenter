"use client";// غياب المدرسين وحضورهم 

import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight, ChevronLeft, X, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TeacherAttendanceStatus } from '../services/attendanceService';

interface TeacherAttendanceTabProps {
    updateMonth: (val: number | string) => void;
    selectedMonthRaw: string;
    selectedMonth: string;
    attendanceData: Record<string, TeacherAttendanceStatus>;
    isTeacher: boolean;
    setActiveDayMenu: (day: number | null) => void;
    setTempStatus: (status: 'present' | 'absent' | 'discipline' | 'reward') => void;
    activeDayMenu: number | null;
    handleAddDiscipline: () => void;
    tempStatus: string;
    tempAmount: 'day' | 'half' | 'quarter';
    setTempAmount: (amt: 'day' | 'half' | 'quarter') => void;
    tempReason: string;
    setTempReason: (val: string) => void;
    dayDetails: Record<number, { reason: string, type: string }>;
    setDayDetails: (details: any) => void;
    updateAttendanceAsync: (params: { date: string, status: TeacherAttendanceStatus, notes?: string }) => Promise<void>;
    dailyRate: number;
}

export const TeacherAttendanceTab = ({
    updateMonth, selectedMonthRaw, selectedMonth, attendanceData,
    isTeacher, setActiveDayMenu, setTempStatus, activeDayMenu,
    handleAddDiscipline, tempStatus, tempAmount, setTempAmount,
    tempReason, setTempReason, dayDetails, setDayDetails,
    updateAttendanceAsync, dailyRate
}: TeacherAttendanceTabProps) => {

    const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    // حسابات إحصائية سريعة
    const totalAbsenceDays = Object.values(attendanceData || {}).reduce((acc: number, status: TeacherAttendanceStatus) => {
        if (status === 'absent') return acc + 1;
        if (status === 'half') return acc + 0.5;
        if (status === 'quarter') return acc + 0.25;
        return acc;
    }, 0);

    const totalRewardDays = Object.values(attendanceData || {}).reduce((acc: number, status: TeacherAttendanceStatus) => {
        if (status === 'full_reward') return acc + 1;
        if (status === 'half_reward') return acc + 0.5;
        if (status === 'quarter_reward') return acc + 0.25;
        return acc;
    }, 0);

    return (
        <div className="space-y-6">
            {/* شريط اختيار الشهر والملخص - تصميم متجاوب */}
            <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                {/* زر السابق */}
                <button
                    onClick={() => updateMonth(-1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <ChevronRight size={16} />
                    <span className="hidden md:inline">الشهر السابق</span>
                </button>

                {/* الشهر */}
                <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                    <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                        <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                        <Calendar size={16} className="text-gray-400 shrink-0" />
                        <input
                            type="month"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={selectedMonthRaw}
                            onChange={(e) => updateMonth(e.target.value)}
                        />
                    </div>
                </div>

                {/* زر الحالي */}
                <button
                    onClick={() => {
                        const today = new Date();
                        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                        updateMonth(monthStr);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <span className="hidden md:inline">الشهر الحالي</span>
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* كروت ملخص الحضور (الغياب والمكافآت) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-row-reverse items-center justify-between">
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 mb-1">  الغياب</p>
                        <p className="text-2xl font-black text-red-600 font-sans">{Number(totalAbsenceDays)} يوم</p>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                        <Calendar size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-row-reverse items-center justify-between">
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 mb-1"> المكافآت</p>
                        <p className="text-2xl font-black text-green-600 font-sans">{Number(totalRewardDays)} يوم</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            {/* التقويم الشهري التفاعلي للحضور */}
            <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                <h4 className="font-black text-gray-900 text-lg md:text-xl text-center">سجل حضور شهر: {selectedMonth}</h4>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {/* رؤوس أيام الأسبوع */}
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[8px] md:text-[10px] font-bold text-gray-400 pb-2">{day}</div>
                    ))}

                    {/* موازنة بداية التقويم (Offset) بناءً على أول يوم في الشهر */}
                    {(() => {
                        const [year, month] = selectedMonthRaw.split('-');
                        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                        // تحويل يوم الأسبوع ليتناسب مع يبدأ التقويم بالسبت (Sat: 6 -> 0, Sun: 0 -> 1, ...)
                        const offset = (firstDay.getDay() + 1) % 7;
                        return Array.from({ length: offset }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square w-full" />
                        ));
                    })()}

                    {/* رسم خلايا الأيام */}
                    {(() => {
                        const [yearStr, monthStr] = selectedMonthRaw.split('-');
                        const year = parseInt(yearStr);
                        const month = parseInt(monthStr);
                        const daysInMonth = new Date(year, month, 0).getDate();

                        const now = new Date();
                        const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
                        const todayDay = now.getDate();

                        const firstDay = new Date(year, month - 1, 1);
                        const startOffset = (firstDay.getDay() + 1) % 7;

                        return Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const rawStatus = (attendanceData as any)[String(day)];

                            const isFuture = isCurrentMonth ? day > todayDay : (year > now.getFullYear() || (year === now.getFullYear() && month > (now.getMonth() + 1)));
                            const isToday = isCurrentMonth && day === todayDay;

                            const status = isFuture ? rawStatus : (rawStatus || 'present');

                            const weekDayIndex = (i + startOffset) % 7;
                            const isWeekend = weekDayIndex === 5 || weekDayIndex === 6; // الخميس والجمعة إجازة رسمية

                            return (
                                <div key={i} className="relative">
                                    <button
                                        onClick={() => {
                                            if (isFuture || isWeekend || isTeacher) return;
                                            setActiveDayMenu(day);
                                            setTempStatus(status?.includes('reward') ? 'reward' : (status === 'present' ? 'present' : (status === 'absent' ? 'absent' : 'discipline')));
                                        }}
                                        className={cn(
                                            "aspect-square w-full rounded-xl md:rounded-2xl border flex flex-col items-center justify-center text-xs md:text-sm font-bold transition-all relative shadow-sm",
                                            isToday ? "border-blue-500 ring-2 ring-blue-500/10 shadow-lg shadow-blue-500/10" : "border-gray-50",
                                            isWeekend || isTeacher ? "bg-red-50/10 border-red-50 text-red-400 cursor-default" :
                                                status === 'present' ? "bg-green-50 border-green-100 text-green-600" :
                                                    (status === 'quarter' || status === 'half') ? "bg-orange-50 border-orange-100 text-orange-600" :
                                                        (status === 'quarter_reward' || status === 'half_reward' || status === 'full_reward') ? "bg-green-50 border-green-200 text-green-600" :
                                                            status === 'absent' ? "bg-red-50 border-red-100 text-red-600" :
                                                                "bg-gray-50/50 text-gray-300 border-gray-100 hover:border-blue-200"
                                        )}
                                    >
                                        <span className="mb-0.5">{day}</span>
                                        {isWeekend && <span className="text-[6px] md:text-[7px] mt-0.5 font-black uppercase text-red-500/40">إجازة</span>}
                                        {(status === 'present' || status?.includes('reward')) && !isWeekend && (
                                            <CheckCircle2 size={14} className="text-green-600/80" />
                                        )}
                                        {(status === 'quarter' || status === 'half' || status === 'quarter_reward' || status === 'half_reward' || status === 'full_reward') && !isWeekend && (
                                            <div className={cn(
                                                "w-1 h-1 rounded-full mt-1",
                                                status?.includes('reward') ? "bg-green-400" : "bg-orange-400"
                                            )} />
                                        )}
                                    </button>
                                    {isToday && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white z-10" />}

                                    <AnimatePresence>
                                        {activeDayMenu === day && !isTeacher && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
                                                    onClick={() => setActiveDayMenu(null)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 z-[201] space-y-4"
                                                >
                                                    <div className="flex flex-row-reverse items-center justify-between border-b border-gray-50 pb-3">
                                                        <h5 className="font-black text-gray-800 text-base">تعديل سجل يوم {day}</h5>
                                                        <button onClick={() => setActiveDayMenu(null)} className="text-gray-400 hover:bg-gray-50 p-1 rounded-full transition-all"><X size={20} /></button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        {/* اختيارات الحالة الرئيسية */}
                                                        {[
                                                            { id: 'present', label: 'حاضر', color: 'bg-green-500' },
                                                            { id: 'absent', label: 'غائب', color: 'bg-red-500' },
                                                            { id: 'discipline', label: 'خصم', color: 'bg-orange-500' },
                                                            { id: 'reward', label: 'مكافأة', color: 'bg-teal-500' }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setTempStatus(opt.id as any)}
                                                                className={cn(
                                                                    "h-10 rounded-xl text-[10px] font-bold border transition-all",
                                                                    tempStatus === opt.id ? `${opt.color} text-white border-transparent shadow-lg shadow-${opt.id}-500/20` : "bg-gray-50 text-gray-500 border-gray-100"
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* تفاصيل إضافية في حال اختيار خصم أو مكافأة */}
                                                    {(tempStatus === 'discipline' || tempStatus === 'reward') && (
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex flex-row-reverse items-center gap-2">
                                                                {['day', 'half', 'quarter'].map(amt => (
                                                                    <button
                                                                        key={amt}
                                                                        onClick={() => setTempAmount(amt as any)}
                                                                        className={cn(
                                                                            "flex-1 h-8 rounded-lg text-[9px] font-bold border transition-all",
                                                                            tempAmount === amt ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-400 border-gray-100"
                                                                        )}
                                                                    >
                                                                        {amt === 'day' ? 'يوم' : amt === 'half' ? 'نصف' : 'ربع'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="text-right space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-400 mr-1">السبب / التفاصيل</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempReason}
                                                                    onChange={(e) => setTempReason(e.target.value)}
                                                                    placeholder="ادخل السبب هنا..."
                                                                    className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-right text-xs focus:ring-2 focus:ring-teal-500/10 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Button onClick={handleAddDiscipline} className="w-full h-10 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-gray-900/20">
                                                        حفظ التعديلات
                                                    </Button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* جدول سجل الانضباط والمكافآت التفصيلي */}
            <div className="space-y-4">
                <h4 className="font-black text-gray-800 text-center text-lg">سجل الانضباط والمكافآت (الشهر المختار)</h4>
                <div className="bg-transparent border-none shadow-none overflow-visible">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(() => {
                            const [year, month] = selectedMonthRaw.split('-');
                            const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                            const startOffset = (firstDay.getDay() + 1) % 7;

                            const records = Object.entries(attendanceData)
                                .filter(([day, status]: [string, TeacherAttendanceStatus]) => {
                                    const d = Number(day);
                                    const weekDayIdx = (d - 1 + startOffset) % 7;
                                    const isWeekend = weekDayIdx === 5 || weekDayIdx === 6;
                                    return status !== 'present' && !isWeekend;
                                });

                            if (records.length === 0) {
                                return <div className="col-span-full py-8 text-center text-gray-400 text-sm font-bold bg-white rounded-3xl border border-gray-100 md:col-span-2">لا توجد سجلات انضباط أو خصومات لهذا الشهر</div>
                            }

                            return records.map(([day, status]: [string, TeacherAttendanceStatus]) => {
                                const d = Number(day);
                                const weekDayIdx = (d - 1 + startOffset) % 7;
                                const amount = status === 'absent' ? dailyRate :
                                    status === 'half' ? (dailyRate * 0.5) :
                                        status === 'quarter' ? (dailyRate * 0.25) :
                                            status === 'half_reward' ? (dailyRate * 0.5) :
                                            status === 'full_reward' ? dailyRate :
                                            status === 'quarter_reward' ? (dailyRate * 0.25) : 0;

                                return (
                                    <div key={day} className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={cn(
                                                "px-2 py-1 rounded-lg text-[10px] font-bold",
                                                status?.includes('reward') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                            )}>
                                                {status?.includes('reward') ? 'مكافأة' : 'خصم'}
                                            </span>
                                            <span className="text-xs font-black text-gray-400 font-sans">{day} {selectedMonth.split(' ')[0]}</span>
                                        </div>

                                        <div className="flex items-center justify-between mb-3 text-right">
                                            <h5 className="font-bold text-gray-900 text-sm">
                                                {dayDetails[Number(day)]?.reason || `تسجيل ${status === 'full_reward' ? 'مكافأة (يوم كامل)' : status === 'half_reward' ? 'مكافأة (نصف يوم)' : status === 'quarter_reward' ? 'مكافأة (ربع يوم)' : 'غياب'} يوم ${weekDays[(d - 1 + startOffset) % 7]}`}
                                            </h5>
                                            <span className="font-black font-sans text-gray-800 text-sm">{amount.toFixed(2)} ج.م</span>
                                        </div>

                                        {!isTeacher && (
                                            <button
                                                onClick={async () => {
                                                    const date = `${selectedMonthRaw}-${String(day).padStart(2, '0')}`;
                                                    await updateAttendanceAsync({ date, status: 'present' });
                                                }}
                                                className="w-full py-2 mt-1 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                حذف السجل
                                            </button>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div >
    );
};