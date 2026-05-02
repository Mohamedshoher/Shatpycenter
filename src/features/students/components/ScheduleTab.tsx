import { useState, useMemo } from 'react';
import { Clock, Trash2, Edit2, Loader2, ArrowRightLeft, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateStudent, getStudents } from '../services/studentService';
import { getGroups } from '../../groups/services/groupService';
import { cn } from '../../../lib/utils';

export default function ScheduleTab({ student }: any) {
    const queryClient = useQueryClient();
    const [selectedSchedules, setSelectedSchedules] = useState<Record<string, string>>({});
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const weekDaysNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    const [swapState, setSwapState] = useState<{ day: string, time: string } | null>(null);
    const [selectedSwapStudentId, setSelectedSwapStudentId] = useState<string>('');
    const [selectedSlotKey, setSelectedSlotKey] = useState<string>('');
    const [isSwapping, setIsSwapping] = useState(false);

    // جلب بيانات الطلاب والمجموعات للتحقق من السعة
    const { data: allStudents } = useQuery({ queryKey: ['students'], queryFn: getStudents });
    const { data: allGroups } = useQuery({ queryKey: ['groups'], queryFn: getGroups });

    const myGroup = allGroups?.find(g => g.id === student.groupId);
    const maxPerHour = myGroup?.maxStudentsPerHour || 5;

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

    // استخراج كافة المواعيد الفريدة المستخدمة في هذه المجموعة حالياً (لمنع التكرار في الخيارات)
    const suggestedTimes = useMemo(() => {
        if (!allStudents || !student.groupId) return [];
        const timesSet = new Set<string>();
        
        const normalizeToFullFormat = (t: string) => {
            if (!t) return '';
            // تنظيف النص الأساسي
            let clean = t.replace(/الساعة|ساعة/g, '').trim();
            
            // استخراج الأرقام (ساعة ودقائق)
            const timeMatch = clean.match(/(\d+)(?::(\d+))?/);
            if (!timeMatch) return '';
            
            let hours = parseInt(timeMatch[1]);
            let minutes = timeMatch[2] || "00";
            
            // استخراج الفترة أو استنتاجها (من ١ لـ ١١ تعتبر عصراً في هذا المركز)
            const periodMatch = t.match(/عصراً|صباحاً/);
            const period = periodMatch ? periodMatch[0] : (hours < 12 && hours >= 1 ? 'عصراً' : 'صباحاً');
            
            return `الساعة ${hours}:${minutes.padStart(2, '0')} ${period}`;
        };

        allStudents.forEach(s => {
            if (s.groupId === student.groupId && s.appointment) {
                s.appointment.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length < 2) return;
                    const t = parts.slice(1).join(':').trim();
                    const fullFormat = normalizeToFullFormat(t);
                    if (fullFormat) timesSet.add(fullFormat);
                });
            }
        });
        
        // ترتيب المواعيد زمنياً بشكل صحيح
        return Array.from(timesSet).sort((a, b) => {
            const getVal = (s: string) => {
                const m = s.match(/(\d+):(\d+)\s+(عصراً|صباحاً)/);
                if (!m) return 0;
                let h = parseInt(m[1]);
                if (m[3] === 'عصراً' && h < 12) h += 12;
                if (m[3] === 'صباحاً' && h === 12) h = 0;
                return h * 60 + parseInt(m[2]);
            };
            return getVal(a) - getVal(b);
        });
    }, [allStudents, student.groupId]);

    // وظيفة تحويل الوقت من تنسيق 24 ساعة إلى التنسيق الموحد للمركز
    const formatToStandardArabic = (timeStr: string) => {
        if (!timeStr) return '';
        // إذا كان الوقت بالفعل بالتنسيق العربي، نعيده كما هو (للمواعيد المختارة من الاقتراحات)
        if (timeStr.includes('الساعة') || timeStr.includes('عصراً') || timeStr.includes('صباحاً')) {
            // نضمن وجود "الساعة" في البداية
            return timeStr.startsWith('الساعة') ? timeStr : `الساعة ${timeStr}`;
        }

        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return timeStr;
        
        const period = hours >= 12 ? 'عصراً' : 'صباحاً';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `الساعة ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // وظيفة حذف موعد محدد
    const handleDeleteSchedule = (dayToDelete: string) => {
        if (!confirm(`هل أنت متأكد من حذف موعد يوم ${dayToDelete}؟`)) return;
        
        const finalSchedules: Record<string, string> = {};
        if (student.appointment) {
            student.appointment.split(',').forEach((p: string) => {
                const parts = p.split(':');
                if (parts.length < 2) return;
                const d = parts[0].trim();
                const t = parts.slice(1).join(':').trim();
                if (d && d !== dayToDelete) finalSchedules[d] = t;
            });
        }
        
        const appointmentString = Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`).join(', ');
            
        updateMutation.mutate(appointmentString);
    };

    const updateAppointmentDay = (appointmentStr: string, targetDay: string, newTime: string) => {
        const finalSchedules: Record<string, string> = {};
        if (appointmentStr) {
            appointmentStr.split(',').forEach((p: string) => {
                const parts = p.split(':');
                if (parts.length < 2) return;
                const d = parts[0].trim();
                const t = parts.slice(1).join(':').trim();
                if (d) finalSchedules[d] = t;
            });
        }
        finalSchedules[targetDay] = newTime;
        return Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`).join(', ');
    };

    const handleSwapConfirm = async () => {
        if (!swapState || !selectedSwapStudentId || !allStudents || !selectedSlotKey) return;
        
        const selectedSlotData = allGroupSlots.find(slot => slot.time === selectedSlotKey);
        if (!selectedSlotData) return;

        const targetDay = selectedSlotData.day;
        const targetTime = selectedSlotData.time;

        const targetStudent = allStudents.find(s => s.id === selectedSwapStudentId);
        if (!targetStudent) return;

        const replaceAppointmentSlot = (appointmentStr: string, oldDay: string, oldTime: string, newDay: string, newTime: string) => {
            const finalSchedules: Record<string, string> = {};
            if (appointmentStr) {
                appointmentStr.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length >= 2) {
                        const d = parts[0].trim();
                        const t = parts.slice(1).join(':').trim();
                        if (d === oldDay && t === oldTime) {
                            // استبعاد الموعد القديم
                        } else {
                            finalSchedules[d] = t;
                        }
                    }
                });
            }
            finalSchedules[newDay] = newTime;
            return Object.keys(finalSchedules)
                .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
                .map(day => `${day}: ${finalSchedules[day]}`).join(', ');
        };

        const myNewAppointment = replaceAppointmentSlot(student.appointment, swapState.day, swapState.time, targetDay, targetTime);
        const targetNewAppointment = replaceAppointmentSlot(targetStudent.appointment, targetDay, targetTime, swapState.day, swapState.time);

        setIsSwapping(true);
        try {
            await Promise.all([
                updateStudent(student.id, { appointment: myNewAppointment }),
                updateStudent(targetStudent.id, { appointment: targetNewAppointment })
            ]);
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setSwapState(null);
            setSelectedSwapStudentId('');
            setSelectedSlotKey('');
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
        } catch (e) {
            alert('حدث خطأ أثناء التبديل');
        } finally {
            setIsSwapping(false);
        }
    };

    const allGroupSlots = useMemo(() => {
        if (!swapState || !allStudents || !student.groupId) return [];
        const slotsMap = new Map<string, { day: string, time: string, students: any[] }>();
        
        allStudents.forEach(s => {
            if (s.id !== student.id && s.groupId === student.groupId && s.status === 'active' && s.appointment) {
                s.appointment.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length >= 2) {
                        const d = parts[0].trim();
                        const t = parts.slice(1).join(':').trim();
                        
                        // استبعاد المواعيد في أيام أخرى، وكذلك استبعاد نفس الموعد الذي نحاول استبداله
                        if (d !== swapState.day) return;
                        if (t === swapState.time) return;
                        
                        const key = t; // نكتفي بالوط فقط لأن اليوم معروف
                        if (!slotsMap.has(key)) {
                            slotsMap.set(key, { day: d, time: t, students: [] });
                        }
                        slotsMap.get(key)!.students.push(s);
                    }
                });
            }
        });
        
        return Array.from(slotsMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [swapState, allStudents, student.id, student.groupId]);

    // وظيفة بدء تعديل موعد موجود
    const handleEditSchedule = (day: string, timeStr: string) => {
        // تحويل الوقت من العربي (مثلاً: الساعة 4:00 عصراً) إلى تنسيق 24 ساعة (16:00) ليعمل مع input[type=time]
        let time24 = '16:00';
        const match = timeStr.match(/(\d+):(\d+)\s+(عصراً|صباحاً)/);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2];
            const period = match[3];
            if (period === 'عصراً' && hours < 12) hours += 12;
            if (period === 'صباحاً' && hours === 12) hours = 0;
            time24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
        
        setSelectedSchedules(prev => ({ ...prev, [day]: time24 }));
        // التمرير للأعلى لرؤية منطقة التعديل
        const container = document.getElementById('schedule-controls');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSave = () => {
        const inputDays = Object.keys(selectedSchedules);
        if (inputDays.length === 0) return alert('اختر يوماً واحداً على الأقل أو قم بتعديل المواعيد الحالية');

        // التحقق من السعة القصوى لكل يوم/وقت مختار
        if (allStudents && student.groupId) {
            for (const day of inputDays) {
                const newTime = formatToStandardArabic(selectedSchedules[day]);
                // عد الطلاب المجدولين لنفس اليوم/الوقت في نفس المجموعة (باستثناء الطالب الحالي)
                const count = allStudents.filter(s =>
                    s.id !== student.id &&
                    s.groupId === student.groupId &&
                    s.status === 'active' &&
                    s.appointment?.split(',').some((p: string) => {
                        const parts = p.split(':');
                        if (parts.length < 2) return false;
                        const d = parts[0].trim();
                        const t = parts.slice(1).join(':').trim();
                        return d === day && t === newTime;
                    })
                ).length;

                if (count >= maxPerHour) {
                    alert(`عدد الطلاب في موعد ${day} - ${newTime} وصل إلى الحد الأقصى (${maxPerHour} طلاب). اختر وقتاً آخر.`);
                    return;
                }
            }
        }

        const finalSchedules: Record<string, string> = {};
        // دمج المواعيد القديمة مع الجديدة (الجديد يطغى على القديم لنفس اليوم)
        if (student.appointment) {
            student.appointment.split(',').forEach((p: string) => {
                const parts = p.split(':');
                if (parts.length < 2) return;
                const d = parts[0].trim();
                const t = parts.slice(1).join(':').trim();
                if (d) finalSchedules[d] = t;
            });
        }
        inputDays.forEach(day => { finalSchedules[day] = formatToStandardArabic(selectedSchedules[day]); });

        const appointmentString = Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`).join(', ');

        updateMutation.mutate(appointmentString);
    };

    return (
        <div className="space-y-6">
            {/* منطقة التحكم في المواعيد */}
            <div id="schedule-controls" className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                {/* زخرفة خلفية */}
                <Clock className="absolute -right-10 -top-10 w-40 h-40 opacity-10 rotate-12" />
                
                <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Clock size={22} />
                        </div>
                        <h4 className="font-black text-lg">تحديث جدول الحضور</h4>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black">
                            <span>الحد الأقصى:</span>
                            <span>{maxPerHour} طلاب / ساعة</span>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4 relative z-10">
                    <p className="text-xs font-bold text-blue-100 mr-1">اختر الأيام المراد إضافتها أو تعديلها:</p>
                    <div className="flex flex-wrap gap-2">
                        {weekDaysNames.map(day => (
                            <button key={day} 
                                onClick={() => setSelectedSchedules(prev => {
                                    const next = {...prev};
                                    if (next[day]) delete next[day]; else next[day] = '16:00';
                                    return next;
                                })}
                                className={cn("px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all duration-300 transform active:scale-95", 
                                selectedSchedules[day] ? "bg-white text-blue-600 border-white shadow-lg" : "bg-blue-700/30 text-blue-100 border-blue-500/30 hover:border-blue-400")}>
                                {day}
                            </button>
                        ))}
                    </div>

                    {Object.keys(selectedSchedules).length > 0 && (
                        <div className="space-y-3 mt-6 animate-in slide-in-from-top-4 duration-300">
                            {Object.keys(selectedSchedules).map(day => {
                                const newTimeFormatted = formatToStandardArabic(selectedSchedules[day]);
                                const usedCount = (allStudents || []).filter(s =>
                                    s.id !== student.id &&
                                    s.groupId === student.groupId &&
                                    s.status === 'active' &&
                                    s.appointment?.split(',').some((p: string) => {
                                        const parts = p.split(':');
                                        if (parts.length < 2) return false;
                                        const d = parts[0].trim();
                                        const t = parts.slice(1).join(':').trim();
                                        return d === day && t === newTimeFormatted;
                                    })
                                ).length;
                                const remaining = maxPerHour - usedCount;
                                const isFull = remaining <= 0;

                                return (
                                    <div key={day} className="bg-white/10 backdrop-blur-md p-4 rounded-[24px] border border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">{day[0]}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm">{day}</span>
                                                    <span className={cn("text-[9px] font-black uppercase tracking-wider mt-0.5", isFull ? "text-red-300" : "text-green-300")}>
                                                        {isFull ? `كامل العدد (${maxPerHour})` : `متاح: ${remaining} أماكن`}
                                                    </span>
                                                </div>
                                            </div>
                                            <input type="time" value={selectedSchedules[day]} 
                                                onChange={(e) => setSelectedSchedules({...selectedSchedules, [day]: e.target.value})}
                                                className="bg-white text-blue-900 border-none rounded-xl px-4 py-2 font-black text-sm focus:ring-2 focus:ring-white/50 transition-all w-32" />
                                        </div>

                                        {/* خيارات المواعيد المستخدمة مسبقاً (لمنع التكرار وتسهيل الاختيار) */}
                                        {suggestedTimes.length > 0 && (
                                            <div className="pt-2 border-t border-white/5">
                                                <p className="text-[9px] font-black text-blue-200 mb-2 uppercase tracking-tight">مواعيد مستخدمة في المجموعة:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                        {suggestedTimes.map(t => {
                                                            const isSelected = newTimeFormatted === (t.startsWith('الساعة') ? t : `الساعة ${t}`);
                                                            return (
                                                                <button 
                                                                    key={t}
                                                                    onClick={() => {
                                                                        // محاولة استخراج الوقت للـ input[type=time]
                                                                        // يدعم: "4", "4:00", "الساعة 4", "الساعة 4:00 عصراً"
                                                                        let hours = 16, minutes = "00";
                                                                        const clean = t.replace(/الساعة|ساعة/g, '').trim();
                                                                        const timeMatch = clean.match(/(\d+)(?::(\d+))?/);
                                                                        const periodMatch = t.match(/عصراً|صباحاً/);
                                                                        const period = periodMatch ? periodMatch[0] : (parseInt(timeMatch?.[1] || '0') < 12 && parseInt(timeMatch?.[1] || '0') >= 1 ? 'عصراً' : 'صباحاً');

                                                                        if (timeMatch) {
                                                                            hours = parseInt(timeMatch[1]);
                                                                            minutes = timeMatch[2] || "00";
                                                                            if (period === 'عصراً' && hours < 12) hours += 12;
                                                                            if (period === 'صباحاً' && hours === 12) hours = 0;
                                                                        }
                                                                        
                                                                        setSelectedSchedules(prev => ({ 
                                                                            ...prev, 
                                                                            [day]: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` 
                                                                        }));
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-300",
                                                                        isSelected 
                                                                            ? "bg-white text-blue-600 border-white shadow-lg scale-105" 
                                                                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                                                                    )}
                                                                >
                                                                    {t}
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full h-14 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black text-sm shadow-xl mt-2 transition-all">
                                {updateMutation.isPending ? (
                                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> جاري حفظ التعديلات...</span>
                                ) : showSaveSuccess ? 'تم حفظ المواعيد بنجاح ✓' : 'تأكيد وحفظ الجدول الجديد'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* عرض المواعيد الحالية المسجلة */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h5 className="font-black text-gray-800 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        المواعيد المسجلة حالياً
                    </h5>
                    <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                        {student.appointment ? student.appointment.split(',').length : 0} أيام
                    </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {student.appointment ? student.appointment.split(',').map((p: string, i: number) => {
                        const parts = p.split(':');
                        const day = parts[0]?.trim();
                        const time = parts.slice(1).join(':')?.trim();
                        
                        if (!day || !time) return null;
                        
                        return (
                            <div key={i} className="group bg-gray-50/50 hover:bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center transition-all hover:shadow-md hover:border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                                        {day[0]}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 mb-0.5">{day}</p>
                                        <p className="text-sm font-black text-slate-700">{time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => { setSwapState({ day, time }); setSelectedSlotKey(''); setSelectedSwapStudentId(''); }}
                                        className="w-8 h-8 flex items-center justify-center text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                        title="استبدال الموعد مع طالب آخر"
                                    >
                                        <ArrowRightLeft size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleEditSchedule(day, time)}
                                        className="w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="تعديل الوقت"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSchedule(day)}
                                        className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                        title="حذف"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full py-12 text-center space-y-3">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                <Clock size={30} className="text-gray-200" />
                            </div>
                            <p className="text-gray-400 text-sm font-bold italic">لا توجد مواعيد مسجلة لهذا الطالب حالياً</p>
                        </div>
                    )}
                </div>
            </div>

            {/* نافذة التبديل */}
            {swapState && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <ArrowRightLeft className="absolute -right-4 -top-4 w-24 h-24 opacity-10 rotate-12" />
                            <div>
                                <h3 className="font-black text-xl mb-1 relative z-10">استبدال الموعد</h3>
                                <p className="text-purple-100 text-xs font-bold relative z-10">
                                    تبديل موعد يوم {swapState.day} ({swapState.time})
                                </p>
                            </div>
                            <button onClick={() => setSwapState(null)} className="relative z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {allGroupSlots.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="font-bold">لا يوجد مواعيد أخرى في هذه المجموعة يوم {swapState.day} للتبديل.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* الخطوة الأولى: اختيار الموعد */}
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                                            اختر الموعد الذي تود نقل الطالب إليه:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {allGroupSlots.map(slot => {
                                                const key = slot.time;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => { setSelectedSlotKey(key); setSelectedSwapStudentId(''); }}
                                                        className={cn("px-4 py-2 rounded-xl text-xs font-black border-2 transition-all duration-300", 
                                                            selectedSlotKey === key 
                                                                ? "bg-purple-600 text-white border-purple-600 shadow-md" 
                                                                : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400"
                                                        )}
                                                    >
                                                        {key}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* الخطوة الثانية: اختيار الطالب */}
                                    {selectedSlotKey && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                                                اختر الطالب المراد التبديل معه:
                                            </p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {allGroupSlots.find(slot => slot.time === selectedSlotKey)?.students.map(candidate => (
                                                    <div 
                                                        key={candidate.id}
                                                        onClick={() => setSelectedSwapStudentId(candidate.id)}
                                                        className={cn("p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between",
                                                            selectedSwapStudentId === candidate.id 
                                                                ? 'border-purple-500 bg-purple-50' 
                                                                : 'border-gray-100 bg-gray-50 hover:border-purple-200'
                                                        )}
                                                    >
                                                        <span className="font-black text-sm text-gray-800">{candidate.fullName}</span>
                                                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                            selectedSwapStudentId === candidate.id ? 'border-purple-500' : 'border-gray-300'
                                                        )}>
                                                            {selectedSwapStudentId === candidate.id && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-6 flex gap-3">
                                <Button 
                                    onClick={handleSwapConfirm}
                                    disabled={!selectedSwapStudentId || isSwapping}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl py-6"
                                >
                                    {isSwapping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد التبديل'}
                                </Button>
                                <Button 
                                    onClick={() => setSwapState(null)}
                                    variant="outline"
                                    className="flex-1 font-black rounded-xl py-6"
                                >
                                    إلغاء
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}