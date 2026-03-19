import { useState, useEffect } from 'react';
import { Clock, Calendar, Trash2, Edit3 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStudent } from '../services/studentService';
import { cn } from '../../../lib/utils';

export default function ScheduleTab({ student }: any) {
    const queryClient = useQueryClient();
    const [selectedSchedules, setSelectedSchedules] = useState<Record<string, string>>({});
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const weekDaysNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // وظيفة تحويل الوقت إلى تنسيق عربي (مثلاً: 4:30 عصراً)
    const formatTimeToArabic = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'عصراً' : 'صباحاً';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `الساعة ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // عملية تحديث الطالب في قاعدة البيانات
    const updateMutation = useMutation({
        mutationFn: (appointment: string) => updateStudent(student.id, { appointment }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
            setSelectedSchedules({});
        }
    });

    const handleSave = () => {
        const inputDays = Object.keys(selectedSchedules);
        if (inputDays.length === 0) return alert('اختر يوماً واحداً على الأقل');

        const finalSchedules: Record<string, string> = {};
        // دمج المواعيد القديمة مع الجديدة
        if (student.appointment) {
            student.appointment.split(',').forEach((p: string) => {
                const [d, t] = p.split(':').map(s => s.trim());
                if (d) finalSchedules[d] = t;
            });
        }
        inputDays.forEach(day => { finalSchedules[day] = formatTimeToArabic(selectedSchedules[day]); });

        const appointmentString = Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`).join(', ');

        updateMutation.mutate(appointmentString);
    };

    return (
        <div className="space-y-6">
            {/* منطقة التحكم في المواعيد */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[32px] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <Clock size={24} />
                    <h4 className="font-bold">تحديد مواعيد الحضور</h4>
                </div>
                
                <div className="grid grid-cols-3 sm:flex flex-wrap gap-2 mb-4">
                    {weekDaysNames.map(day => (
                        <button key={day} 
                            onClick={() => setSelectedSchedules(prev => {
                                const next = {...prev};
                                if (next[day]) delete next[day]; else next[day] = '16:00';
                                return next;
                            })}
                            className={cn("px-4 py-2 rounded-xl text-xs font-black border-2 transition-all", 
                            selectedSchedules[day] ? "bg-white text-blue-600 border-white" : "bg-blue-700/30 text-blue-100 border-blue-500/30")}>
                            {day}
                        </button>
                    ))}
                </div>

                {Object.keys(selectedSchedules).map(day => (
                    <div key={day} className="flex items-center justify-between bg-white/10 p-3 rounded-xl mb-2">
                        <span className="font-bold">{day}</span>
                        <input type="time" value={selectedSchedules[day]} 
                            onChange={(e) => setSelectedSchedules({...selectedSchedules, [day]: e.target.value})}
                            className="bg-white/20 border-none rounded-lg px-2 text-white [color-scheme:dark]" />
                    </div>
                ))}

                <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full bg-white text-blue-600 hover:bg-blue-50 mt-2">
                    {updateMutation.isPending ? 'جاري الحفظ...' : showSaveSuccess ? 'تم الحفظ ✓' : 'حفظ الجدول'}
                </Button>
            </div>

            {/* عرض المواعيد الحالية المسجلة */}
            <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                <h5 className="font-black mb-4">المواعيد المسجلة حالياً</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {student.appointment ? student.appointment.split(',').map((p: string, i: number) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-gray-400">{p.split(':')[0]}</p>
                                <p className="text-sm font-bold text-blue-600">{p.split(':')[1]}</p>
                            </div>
                            <Trash2 size={16} className="text-red-400 cursor-pointer" onClick={() => { /* منطق الحذف */ }} />
                        </div>
                    )) : <p className="text-center text-gray-400 text-sm italic">لا توجد مواعيد مسجلة</p>}
                </div>
            </div>
        </div>
    );
}