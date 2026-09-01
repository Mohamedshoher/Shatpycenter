import { useState, useMemo } from 'react';
import Clock from 'lucide-react/dist/esm/icons/clock'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Edit2 from 'lucide-react/dist/esm/icons/edit-2'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left'
import Check from 'lucide-react/dist/esm/icons/check'
import Plus from 'lucide-react/dist/esm/icons/plus'
import CalendarPlus from 'lucide-react/dist/esm/icons/calendar-plus'
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '../../../components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateStudent, getStudents } from '../services/studentService';
import { getGroups } from '../../groups/services/groupService';
import { cn } from '../../../lib/utils';

export default function ScheduleTab({ student }: any) {
    const queryClient = useQueryClient();
    const weekDaysNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    const [localAppointment, setLocalAppointment] = useState<string>(student?.appointment || '');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [commonTime, setCommonTime] = useState<string>('16:00'); // الوقت الموحد الافتراضي 4:00 عصراً
    const [customDayTimes, setCustomDayTimes] = useState<Record<string, string>>({});
    const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    const [swapState, setSwapState] = useState<{ day: string, time: string } | null>(null);
    const [selectedSwapStudentId, setSelectedSwapStudentId] = useState<string>('');
    const [selectedSlotKey, setSelectedSlotKey] = useState<string>('');
    const [isSwapping, setIsSwapping] = useState(false);

    // جلب بيانات الطلاب والمجموعات للتحقق من السعة
    const { data: allStudents } = useQuery({ queryKey: ['students'], queryFn: () => getStudents() });
    const { data: allGroups } = useQuery({ queryKey: ['groups'], queryFn: () => getGroups() });

    const myGroup = allGroups?.find(g => g.id === student.groupId);
    const maxPerHour = myGroup?.maxStudentsPerHour || 5;

    // استخراج الأيام المسجلة حالياً
    const currentDaysMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (localAppointment) {
            localAppointment.split(',').forEach((p: string) => {
                const parts = p.split(':');
                if (parts.length >= 2) {
                    const d = parts[0].trim();
                    const t = parts.slice(1).join(':').trim();
                    if (d) map[d] = t;
                }
            });
        }
        return map;
    }, [localAppointment]);

    // عملية تحديث الطالب في قاعدة البيانات
    const updateMutation = useMutation({
        mutationFn: (appointment: string) => updateStudent(student.id, { appointment }),
        onMutate: (appointment) => {
            setLocalAppointment(appointment);
            setSelectedDays([]);
            setCustomDayTimes({});
            return null;
        },
        onSuccess: (_data, appointment) => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setLocalAppointment(appointment);
            setShowSaveSuccess(true);
            setTimeout(() => {
                setShowSaveSuccess(false);
                setIsEditorOpen(false);
            }, 1500);
        }
    });

    // استخراج كافة المواعيد الفريدة المستخدمة في هذه المجموعة حالياً
    const suggestedTimes = useMemo(() => {
        if (!allStudents || !student.groupId) return ['الساعة 4:00 عصراً', 'الساعة 4:30 عصراً', 'الساعة 5:00 عصراً', 'الساعة 5:30 عصراً', 'الساعة 6:00 عصراً'];
        const timesSet = new Set<string>();
        
        const normalizeToFullFormat = (t: string) => {
            if (!t) return '';
            let clean = t.replace(/الساعة|ساعة/g, '').trim();
            const timeMatch = clean.match(/(\d+)(?::(\d+))?/);
            if (!timeMatch) return '';
            
            let hours = parseInt(timeMatch[1]);
            let minutes = timeMatch[2] || "00";
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
        
        if (timesSet.size === 0) {
            return ['الساعة 4:00 عصراً', 'الساعة 4:30 عصراً', 'الساعة 5:00 عصراً', 'الساعة 5:30 عصراً', 'الساعة 6:00 عصراً'];
        }

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
        if (timeStr.includes('الساعة') || timeStr.includes('عصراً') || timeStr.includes('صباحاً')) {
            return timeStr.startsWith('الساعة') ? timeStr : `الساعة ${timeStr}`;
        }

        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return timeStr;
        
        const period = hours >= 12 ? 'عصراً' : 'صباحاً';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `الساعة ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // تحويل الوقت من العربي إلى 24 ساعة
    const parseArabicToTime24 = (t: string) => {
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
        return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    };

    // وظيفة حذف موعد محدد
    const handleDeleteSchedule = (dayToDelete: string) => {
        if (!confirm(`هل أنت متأكد من حذف موعد يوم ${dayToDelete}؟`)) return;
        
        const finalSchedules: Record<string, string> = {};
        if (localAppointment) {
            localAppointment.split(',').forEach((p: string) => {
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

    // وظيفة مسح جميع المواعيد
    const handleClearAllSchedules = () => {
        if (!localAppointment) return;
        if (!confirm('هل أنت متأكد من مسح جميع مواعيد هذا الطالب؟')) return;
        updateMutation.mutate('');
    };

    // وظيفة بدء تعديل موعد موجود
    const handleEditSchedule = (day: string, timeStr: string) => {
        const time24 = parseArabicToTime24(timeStr);
        setSelectedDays([day]);
        setCommonTime(time24);
        setCustomDayTimes({ [day]: time24 });
        setIsEditorOpen(true);
        
        const container = document.getElementById('schedule-editor-box');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // تبديل اختيار يوم
    const toggleDay = (day: string) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // تحديد أيام شائعة
    const handleSelectWeekdays = () => {
        setSelectedDays(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']);
    };

    const handleSelectAllDays = () => {
        setSelectedDays(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);
    };

    // حفظ المواعيد
    const handleSave = () => {
        if (selectedDays.length === 0) {
            return alert('الرجاء اختيار يوم واحد على الأقل لحفظ الموعد');
        }

        // التحقق من السعة
        if (allStudents && student.groupId) {
            for (const day of selectedDays) {
                const dayTime = isCustomMode ? (customDayTimes[day] || commonTime) : commonTime;
                const formattedTime = formatToStandardArabic(dayTime);

                const count = allStudents.filter(s =>
                    s.id !== student.id &&
                    s.groupId === student.groupId &&
                    s.status === 'active' &&
                    s.appointment?.split(',').some((p: string) => {
                        const parts = p.split(':');
                        if (parts.length < 2) return false;
                        const d = parts[0].trim();
                        const t = parts.slice(1).join(':').trim();
                        return d === day && t === formattedTime;
                    })
                ).length;

                if (count >= maxPerHour) {
                    alert(`عدد الطلاب في موعد ${day} - ${formattedTime} مكتمل (${maxPerHour} طلاب). الرجاء اختيار وقت آخر.`);
                    return;
                }
            }
        }

        const finalSchedules: Record<string, string> = { ...currentDaysMap };
        selectedDays.forEach(day => {
            const dayTime = isCustomMode ? (customDayTimes[day] || commonTime) : commonTime;
            finalSchedules[day] = formatToStandardArabic(dayTime);
        });

        const appointmentString = Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`).join(', ');

        updateMutation.mutate(appointmentString);
    };

    // منطق التبديل مع طالب آخر
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
                        if (d !== swapState.day) return;
                        if (t === swapState.time) return;
                        
                        const key = t;
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

    const handleSwapConfirm = async () => {
        if (!swapState || !selectedSwapStudentId || !allStudents || !selectedSlotKey) return;
        
        const selectedSlotData = allGroupSlots.find(slot => slot.time === selectedSlotKey);
        if (!selectedSlotData) return;

        const targetDay = selectedSlotData.day;
        const targetTime = selectedSlotData.time;
        const targetStudent = allStudents.find(s => s.id === selectedSwapStudentId);
        if (!targetStudent) return;

        const replaceAppointmentSlot = (appointmentStr: string | undefined, oldDay: string, oldTime: string, newDay: string, newTime: string) => {
            const finalSchedules: Record<string, string> = {};
            if (appointmentStr) {
                appointmentStr.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length >= 2) {
                        const d = parts[0].trim();
                        const t = parts.slice(1).join(':').trim();
                        if (d === oldDay && t === oldTime) {
                            // استبعاد
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

        const myNewAppointment = replaceAppointmentSlot(localAppointment, swapState.day, swapState.time, targetDay, targetTime);
        const targetNewAppointment = replaceAppointmentSlot(targetStudent.appointment, targetDay, targetTime, swapState.day, swapState.time);

        setIsSwapping(true);
        try {
            await Promise.all([
                updateStudent(student.id, { appointment: myNewAppointment }),
                updateStudent(targetStudent.id, { appointment: targetNewAppointment })
            ]);
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setLocalAppointment(myNewAppointment);
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

    return (
        <div className="space-y-4">
            {/* بطاقة تحديد وتحديث المواعيد (تظهر فقط عند النقر على زر الإضافة/التعديل) */}
            {isEditorOpen && (
                <div id="schedule-editor-box" className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-4 md:p-5 rounded-[28px] text-white shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-blue-400/30">
                    {/* الرأس وأزرار الإغلاق والسعة */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h4 className="font-black text-sm md:text-base leading-tight">تحديد وتحديث المواعيد</h4>
                                <span className="text-[10px] text-blue-100 font-bold">الحد الأقصى: {maxPerHour} طلاب/ساعة</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsEditorOpen(false)}
                            className="w-7 h-7 bg-white/15 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            title="إغلاق"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* 1. اختيار الأيام */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-100 flex-wrap gap-1">
                            <span>1. اختر الأيام المراد جدولتها:</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleSelectWeekdays}
                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    السبت-الأربعاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSelectAllDays}
                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    السبت-الخميس
                                </button>
                                {selectedDays.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDays([])}
                                        className="text-[10px] text-red-200 hover:text-white transition-colors cursor-pointer"
                                    >
                                        إلغاء التحديد
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                            {weekDaysNames.map(day => {
                                const isSelected = selectedDays.includes(day);
                                const hasExisting = Boolean(currentDaysMap[day]);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={cn(
                                            "py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 relative active:scale-95 border cursor-pointer",
                                            isSelected
                                                ? "bg-white text-blue-700 border-white shadow-md font-black"
                                                : hasExisting
                                                    ? "bg-blue-800/40 text-blue-100 border-blue-400/40 hover:bg-blue-800/60"
                                                    : "bg-blue-700/25 text-blue-200 border-blue-500/20 hover:bg-blue-700/50"
                                        )}
                                    >
                                        <span className="flex items-center gap-1">
                                            {isSelected && <Check size={12} className="stroke-[3px]" />}
                                            {day}
                                        </span>
                                        {hasExisting && !isSelected && (
                                            <span className="text-[9px] text-blue-200 font-bold opacity-80">مسجل</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. تحديد الوقت الموحد والأوقات السريعة */}
                    {selectedDays.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-white/15 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between text-[11px] font-bold text-blue-100">
                                <span>2. اختر الوقت ({selectedDays.length} {selectedDays.length === 1 ? 'يوم' : 'أيام'} مختارة):</span>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomMode(!isCustomMode)}
                                    className="text-[10px] text-blue-200 hover:text-white underline underline-offset-2 cursor-pointer"
                                >
                                    {isCustomMode ? 'الوقت الموحد' : 'تخصيص وقت لكل يوم'}
                                </button>
                            </div>

                            {!isCustomMode ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={commonTime}
                                            onChange={(e) => setCommonTime(e.target.value)}
                                            className="bg-white text-blue-900 border-none rounded-xl px-3.5 py-2 font-black text-sm focus:ring-2 focus:ring-white/50 w-32 shadow-sm"
                                        />
                                        <span className="text-xs font-bold text-blue-100">
                                            = {formatToStandardArabic(commonTime)}
                                        </span>
                                    </div>

                                    {/* مواعيد سريعة بنقرة واحدة */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {suggestedTimes.slice(0, 6).map(t => {
                                            const t24 = parseArabicToTime24(t);
                                            const isCurrent = commonTime === t24;
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setCommonTime(t24)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer",
                                                        isCurrent
                                                            ? "bg-white text-blue-700 border-white shadow-md scale-105"
                                                            : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                                                    )}
                                                >
                                                    {t}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* تخصيص وقت لكل يوم على حدة */
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                                    {selectedDays.map(day => (
                                        <div key={day} className="bg-white/10 p-2.5 rounded-xl flex items-center justify-between">
                                            <span className="text-xs font-black">{day}</span>
                                            <input
                                                type="time"
                                                value={customDayTimes[day] || commonTime}
                                                onChange={(e) => setCustomDayTimes({ ...customDayTimes, [day]: e.target.value })}
                                                className="bg-white text-blue-900 border-none rounded-lg px-2 py-1 font-black text-xs w-28"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* زر الحفظ الموحد */}
                            <Button
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="w-full h-11 bg-white hover:bg-blue-50 text-blue-700 rounded-xl font-black text-xs md:text-sm shadow-md transition-all active:scale-[0.99] mt-2 cursor-pointer"
                            >
                                {updateMutation.isPending ? (
                                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> جاري حفظ المواعيد...</span>
                                ) : showSaveSuccess ? 'تم حفظ المواعيد بنجاح ✓' : `حفظ وتثبيت مواعيد (${selectedDays.length} أيام)`}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* عرض المواعيد الحالية المسجلة */}
            <div className="bg-white p-4 md:p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h5 className="font-black text-gray-800 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                        المواعيد المسجلة حالياً
                    </h5>

                    <div className="flex items-center gap-2">
                        {/* زر فتح/إغلاق محرر المواعيد */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditorOpen(!isEditorOpen);
                                if (!isEditorOpen && selectedDays.length === 0) {
                                    setSelectedDays(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl transition-all border cursor-pointer active:scale-95",
                                isEditorOpen
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            )}
                            title="تعديل أو إضافة موعد جديد"
                        >
                            {isEditorOpen ? <X size={14} /> : <CalendarPlus size={14} />}
                            <span>{isEditorOpen ? 'إغلاق المحرر' : 'تعديل / إضافة مواعيد'}</span>
                        </button>

                        {Boolean(localAppointment) && (
                            <button
                                onClick={handleClearAllSchedules}
                                disabled={updateMutation.isPending}
                                className="flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl transition-all border border-red-100 disabled:opacity-50 cursor-pointer"
                                title="مسح جميع مواعيد الطالب"
                            >
                                <Trash2 size={13} />
                                <span>مسح الكل</span>
                            </button>
                        )}
                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xl">
                            {localAppointment ? localAppointment.split(',').length : 0} أيام
                        </span>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {localAppointment ? localAppointment.split(',').map((p: string, i: number) => {
                        const parts = p.split(':');
                        const day = parts[0]?.trim();
                        const time = parts.slice(1).join(':')?.trim();
                        
                        if (!day || !time) return null;
                        
                        return (
                            <div key={i} className="bg-gray-50/70 hover:bg-white p-3 rounded-2xl border border-gray-100 hover:border-blue-200 flex justify-between items-center transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                                        {day[0]}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 leading-tight">{day}</p>
                                        <p className="text-xs font-black text-slate-800">{time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => { setSwapState({ day, time }); setSelectedSlotKey(''); setSelectedSwapStudentId(''); }}
                                        className="w-7 h-7 flex items-center justify-center text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100 cursor-pointer"
                                        title="استبدال الموعد مع طالب آخر"
                                    >
                                        <ArrowRightLeft size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleEditSchedule(day, time)}
                                        className="w-7 h-7 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                                        title="تعديل وقت هذا اليوم"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSchedule(day)}
                                        className="w-7 h-7 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 cursor-pointer"
                                        title="حذف الموعد"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full py-8 text-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <Clock size={28} className="text-gray-300 mx-auto" />
                            <p className="text-gray-400 text-xs font-bold">لا توجد مواعيد مسجلة لهذا الطالب حالياً</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditorOpen(true);
                                    setSelectedDays(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-colors cursor-pointer shadow-sm"
                            >
                                <Plus size={14} />
                                <span>إضافة جدول مواعيد الآن</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* نافذة التبديل */}
            {swapState && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-5 text-white flex justify-between items-center relative overflow-hidden">
                            <ArrowRightLeft className="absolute -right-4 -top-4 w-24 h-24 opacity-10 rotate-12" />
                            <div>
                                <h3 className="font-black text-lg mb-0.5 relative z-10">استبدال الموعد</h3>
                                <p className="text-purple-100 text-xs font-bold relative z-10">
                                    تبديل موعد يوم {swapState.day} ({swapState.time})
                                </p>
                            </div>
                            <button onClick={() => setSwapState(null)} className="relative z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-5">
                            {allGroupSlots.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="font-bold text-xs">لا يوجد مواعيد أخرى في هذه المجموعة يوم {swapState.day} للتبديل.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                                            <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                                            اختر الموعد البديل:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {allGroupSlots.map(slot => {
                                                const key = slot.time;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => { setSelectedSlotKey(key); setSelectedSwapStudentId(''); }}
                                                        className={cn("px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer", 
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

                                    {selectedSlotKey && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                                                اختر الطالب للتبديل معه:
                                            </p>
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                {allGroupSlots.find(slot => slot.time === selectedSlotKey)?.students.map(candidate => (
                                                    <div 
                                                        key={candidate.id}
                                                        onClick={() => setSelectedSwapStudentId(candidate.id)}
                                                        className={cn("p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-black",
                                                            selectedSwapStudentId === candidate.id 
                                                                ? 'border-purple-500 bg-purple-50 text-purple-900' 
                                                                : 'border-gray-100 bg-gray-50 hover:border-purple-200 text-gray-800'
                                                        )}
                                                    >
                                                        <span>{candidate.fullName}</span>
                                                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center",
                                                            selectedSwapStudentId === candidate.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                                        )}>
                                                            {selectedSwapStudentId === candidate.id && <Check size={10} className="text-white stroke-[3px]" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-5 flex gap-2">
                                <Button 
                                    onClick={handleSwapConfirm}
                                    disabled={!selectedSwapStudentId || isSwapping}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl py-5 text-xs"
                                >
                                    {isSwapping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد التبديل'}
                                </Button>
                                <Button 
                                    onClick={() => setSwapState(null)}
                                    variant="outline"
                                    className="flex-1 font-black rounded-xl py-5 text-xs"
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