"use client";
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStudents } from '../hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import {
    UserPlus,
    Search,
    MessageCircle,
    Phone,
    FileText,
    Edit3,
    Archive,
    CreditCard,
    Menu,
    SlidersHorizontal,
    X,
    User,
    BookOpen,
    Calendar,
    Clock
} from 'lucide-react';
import {
    calculateTotalAbsence,
    calculateContinuousAbsence
} from '@/lib/attendance-utils';

import { cn, tieredSearchFilter, getWhatsAppUrl } from '@/lib/utils';
import { Student } from '@/types';
import dynamic from 'next/dynamic';

const AddStudentModal = dynamic(() => import('./AddStudentModal'), { ssr: false });
const StudentDetailModal = dynamic(() => import('./StudentDetailModal'), { ssr: false });
const EditStudentModal = dynamic(() => import('./EditStudentModal'), { ssr: false });

interface StudentListProps {
    groupId?: string;
    customTitle?: string;
}

export default function StudentList({ groupId, customTitle }: StudentListProps) {
    const { data: students, isLoading } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const myGroups = useMemo(() => {
        return groups?.filter(g => {
            if (user?.role === 'teacher') return g.teacherId === user.teacherId;
            if (user?.role === 'supervisor') {
                const sections = user.responsibleSections || [];
                if (sections.length > 0) {
                    return sections.some(section => g.name.includes(section));
                }
            }
            return true;
        }) || [];
    }, [groups, user]);

    const myGroupsIds = useMemo(() => myGroups.map(g => g.id), [myGroups]);

    const groupsMap = useMemo(() => {
        return (groups || []).reduce((acc, g) => {
            acc[g.id] = g.name;
            return acc;
        }, {} as Record<string, string>);
    }, [groups]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [selectedTab, setSelectedTab] = useState('attendance');
    const [filter, setFilter] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [scheduleFilterTime, setScheduleFilterTime] = useState('الكل');

    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const isToday = useMemo(() => {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return selectedDate === todayStr;
    }, [selectedDate]);

    const weekDaysNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const currentDayName = useMemo(() => {
        // (getDay() + 1) % 7 يرفع الرقم 1 (ليصبح السبت 0 بدلاً من 6 والأحد 1 بدلاً من 0)
        return weekDaysNames[(new Date(selectedDate).getDay() + 1) % 7];
    }, [selectedDate]);

    useEffect(() => {
        setScheduleFilterTime('الكل');
    }, [selectedDate, groupId]);


    const currentMonthKey = useMemo(() => {
        const [y, m] = selectedDate.split('-');
        return `${y}-${m}`;
    }, [selectedDate]);

    const normalizeTime = (t: string) => {
        if (!t) return '';
        // تنظيف النص الأساسي
        let clean = t.replace(/الساعة|ساعة/g, '').trim();
        
        // استخراج الأرقام (ساعة ودقائق)
        const timeMatch = clean.match(/(\d+)(?::(\d+))?/);
        if (!timeMatch) return t;
        
        let hours = parseInt(timeMatch[1]);
        let minutes = timeMatch[2] || "00";
        
        // استخراج الفترة أو استنتاجها (من ١ لـ ١١ تعتبر عصراً في هذا المركز)
        const periodMatch = t.match(/عصراً|صباحاً/);
        const period = periodMatch ? periodMatch[0] : (hours < 12 && hours >= 1 ? 'عصراً' : 'صباحاً');
        
        return `الساعة ${hours}:${minutes.padStart(2, '0')} ${period}`;
    };

    const availableTimes = useMemo(() => {
        if (!students) return [];
        const timesMap = new Map<string, string>(); // Map for normalized -> original
        students.forEach(student => {
             if (student.status !== 'active') return;
             if (groupId && student.groupId !== groupId) return;
             if (user?.role === 'teacher' && (!student.groupId || !myGroupsIds.includes(student.groupId))) return;
             if (user?.role === 'supervisor' && (!student.groupId || !myGroupsIds.includes(student.groupId))) return;

             if (student.appointment) {
                 student.appointment.split(',').forEach((p: string) => {
                     const parts = p.split(':');
                     if (parts.length >= 2) {
                         const d = parts[0].trim();
                         const t = parts.slice(1).join(':').trim();
                         if (d === currentDayName && t) {
                             const norm = normalizeTime(t);
                             if (!timesMap.has(norm)) {
                                 timesMap.set(norm, t);
                             }
                         }
                     }
                 });
             }
        });
        // نقوم بترتيب المواعيد بناءً على الوقت الموحد
        return Array.from(timesMap.values()).sort((a, b) => normalizeTime(a).localeCompare(normalizeTime(b), undefined, { numeric: true }));
    }, [students, currentDayName, groupId, user, myGroupsIds]);


    const { data: attendanceData = { today: {}, monthMap: {} } as any, isFetching: isAttendanceFetching } = useQuery({
        queryKey: ['attendance-context', selectedDate],
        queryFn: async () => {
            if (!students || students.length === 0) return { today: {}, monthMap: {} };
            const { getAllAttendanceForMonth } = await import('../services/recordsService');

            const dateParts = selectedDate.split('-').map(Number);
            const dayNum = dateParts[2];
            const monthKey = `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}`;

            const prevDate = new Date(dateParts[0], dateParts[1] - 2, 1);
            const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

            const [attendanceCurrent, attendancePrev] = await Promise.all([
                getAllAttendanceForMonth(monthKey),
                getAllAttendanceForMonth(prevMonthKey)
            ]);

            const mergedMap: Record<string, any[]> = {};
            const allStudentIds = new Set([...Object.keys(attendanceCurrent), ...Object.keys(attendancePrev)]);

            allStudentIds.forEach(id => {
                mergedMap[id] = [
                    ...(attendanceCurrent[id] || []),
                    ...(attendancePrev[id] || [])
                ];
            });

            const selectedDayMap: Record<string, 'present' | 'absent'> = {};
            students.forEach(student => {
                const studentIdStr = String(student.id);
                const records = mergedMap[studentIdStr] || [];

                // استخراج السجلات المطابقة للشهر واليوم المحددين
                const dayRecords = records.filter(r => r.month === monthKey && Number(r.day) === dayNum);
                const dayRec = dayRecords.length > 0 ? dayRecords[dayRecords.length - 1] : null;

                if (dayRec) {
                    selectedDayMap[studentIdStr] = dayRec.status;
                }
            });

            return { today: selectedDayMap, monthMap: mergedMap };
        },
        enabled: !!(students && students.length > 0),
        staleTime: 1000 * 30, // 30 seconds to stay fresh
    });

    const attendanceState = useMemo(() => attendanceData.today, [attendanceData.today]);

    const isManagement = useMemo(() => {
        return user?.role === 'director' || user?.role === 'supervisor';
    }, [user]);

    const getGroupName = useCallback((groupId: string | null) => {
        if (!groupId) return '';
        return groupsMap[groupId] || '';
    }, [groupsMap]);

    // Inside StudentList component...
    const filteredStudents = useMemo(() => {
        if (!students) return [];

        const baseFiltered = students.filter(student => {
            if (user?.role === 'teacher' || user?.role === 'supervisor') {
                if (!student.groupId || !myGroupsIds.includes(student.groupId)) return false;
            }

            let matchesFilter = true;
            if (groupId) {
                matchesFilter = student.groupId === groupId;
            } else if (filter === 'الكل') {
                matchesFilter = true;
            } else if (filter === 'الأيتام') {
                matchesFilter = !!student.isOrphan;
            } else if (filter === 'أرقام ناقصة') {
                const phone = student.parentPhone.replace(/[^0-9]/g, '');
                matchesFilter = phone.length < 11;
            }

            if (scheduleFilterTime !== 'الكل') {
                let hasTime = false;
                if (student.appointment) {
                    const normFilter = normalizeTime(scheduleFilterTime);
                    student.appointment.split(',').forEach((p: string) => {
                        const parts = p.split(':');
                        if (parts.length >= 2) {
                            const d = parts[0].trim();
                            const t = parts.slice(1).join(':').trim();
                            if (d === currentDayName && normalizeTime(t) === normFilter) {
                                hasTime = true;
                            }
                        }
                    });
                }
                if (!hasTime) matchesFilter = false;
            }

            const isActive = student.status === 'active';
            return matchesFilter && isActive;
        });

        // تطبيق البحث المتدرج باستخدام الدالة الموحدة
        const finalResults = tieredSearchFilter(baseFiltered, searchTerm, (s) => s.fullName);

        return finalResults.sort((a, b) => {
            if (searchTerm) return 0;
            if (filter === 'الأكثر غياباً') {
                const absA = calculateTotalAbsence(attendanceData.monthMap[a.id] || [], currentMonthKey);
                const absB = calculateTotalAbsence(attendanceData.monthMap[b.id] || [], currentMonthKey);
                if (absA !== absB) return absB - absA;
            }
            const groupA = getGroupName(a.groupId);
            const groupB = getGroupName(b.groupId);
            if (groupA !== groupB) return groupA.localeCompare(groupB, 'ar');
            return a.fullName.localeCompare(b.fullName, 'ar');
        });
    }, [students, user, myGroupsIds, searchTerm, filter, scheduleFilterTime, currentDayName, groupId, getGroupName]);

    const handleOpenModal = (student: Student, tab: string = 'attendance') => {
        setSelectedTab(tab);
        setSelectedStudent(student);
    };

    const handleWhatsApp = (student: Student) => {
        window.open(getWhatsAppUrl(student.parentPhone), '_blank');
    };

    const handleWelcomeWhatsApp = (student: Student) => {
        const phone = student.parentPhone || student.studentPhone || '';
        const password = phone.length >= 6 ? phone.slice(-6) : phone;
        const message = `السلام عليكم ورحمة الله وبركاته، 🌸
أهلاً بكم في مركز الشاطبي لتحفيظ القرآن الكريم! 📖

يسعدنا انضمام الطالب/ة: *${student.fullName}* إلينا. 🎉

💰 *تفاصيل المصروفات:*
قيمة الاشتراك الشهري هي *${student.monthlyAmount || 80} ج.م* للمجموعة الواحدة.
⚠️ *تنبيه مهم:* تُستحق المصروفات مقدماً مع أول يوم من كل شهر.

🚫 *الغياب والاعتذار:*
في حال الرغبة في التغيب، لابد من إرسال اعتذار مسبق عبر رسالة على الواتساب أو من خلال موقعنا الإلكتروني.

🌐 *بوابة ولي الأمر:*
لمتابعة مستوى الطالب، تقارير الحفظ، وسجل الحضور والغياب، يرجى الدخول إلى حسابكم عبر الرابط التالي:
🔗 https://shatpycenter-um2b.vercel.app/attendance-report

📱 *طريقة الدخول:*
- *اسم المستخدم:* رقم الهاتف المسجل لدينا (${phone}).
- *كلمة المرور:* آخر 6 أرقام من رقم الهاتف (${password}).

متابعتكم المستمرة عبر الموقع تساهم بشكل كبير في تشجيع الطالب ورفع مستواه. 🌟
نسأل الله التوفيق لأبنائنا جميعاً. 🤲`;

        window.open(getWhatsAppUrl(phone, message), '_blank');
    };

    const handleCall = (student: Student) => {
        window.location.href = `tel:${student.parentPhone}`;
    };

    const { archiveStudent } = useStudents();
    const handleArchive = (student: Student) => {
        if (confirm(`هل أنت متأكد من أرشفة الطالب ${student.fullName}؟`)) {
            archiveStudent(student.id);
        }
    };

    const handleAttendance = useCallback(async (student: Student, status: 'present' | 'absent') => {
        const dateParts = selectedDate.split('-').map(Number);
        const day = dateParts[2];
        const monthKey = `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}`;
        const dateStrKey = selectedDate;

        // 1. التحديث الفوري للكاش (Optimistic Update)
        queryClient.setQueryData(
            ['attendance-context', dateStrKey],
            (old: any) => {
                const newToday = { ...(old?.today || {}), [student.id]: status };
                // تحديث الـ monthMap أيضاً لضمان دقة الفلاتر فوراً
                const newRecords = [...(old?.monthMap?.[student.id] || [])];
                const dayIndex = newRecords.findIndex(r => r.day === day && r.month === monthKey);
                if (dayIndex > -1) {
                    newRecords[dayIndex] = { ...newRecords[dayIndex], status };
                } else {
                    newRecords.push({ studentId: student.id, day, month: monthKey, status });
                }
                return {
                    today: newToday,
                    monthMap: { ...(old?.monthMap || {}), [student.id]: newRecords }
                };
            }
        );

        // 2. تحديث الكاش العالمي للحضور (تفاصيل الطالب)
        queryClient.setQueryData(['attendance', student.id], (old: any) => {
            const records = Array.isArray(old) ? old : [];
            const filtered = records.filter((r: any) => !(r.day === day && r.month === monthKey));
            return [...filtered, { studentId: student.id, day, month: monthKey, status }];
        });

        // 3. إرسال حدث للمزامنة الإضافية
        window.dispatchEvent(new CustomEvent('updateAttendance', {
            detail: { studentId: student.id, day, status, month: monthKey }
        }));

        // 4. الحفظ في الخلفية
        try {
            const { addAttendanceRecord } = await import('../services/recordsService');
            await addAttendanceRecord({
                studentId: student.id,
                day,
                month: monthKey,
                status
            });
            // نحدث كاش الطالب الفردي فقط للتأكيد
            queryClient.invalidateQueries({ queryKey: ['attendance', student.id] });
        } catch (error) {
            console.error('Error saving attendance:', error);
        }
    }, [queryClient, selectedDate]);

    const handleEdit = (student: Student) => {
        setStudentToEdit(student);
        setIsEditModalOpen(true);
    };



    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-48 w-full bg-white/50 animate-pulse rounded-[40px] border border-gray-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="pb-24 transition-all duration-500">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="relative flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="relative z-50 flex items-center gap-2">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 rounded-[18px] sm:rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform shrink-0"
                            title="إضافة طالب جديد"
                        >
                            <UserPlus size={22} />
                        </button>

                        <button
                            onClick={toggleSidebar}
                            className="md:hidden w-11 h-11 bg-white rounded-[18px] border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0"
                        >
                            <Menu size={22} />
                        </button>
                    </div>

                    {!isSearchOpen && (
                        <div className={cn(
                            "flex flex-col items-center absolute left-1/2 -translate-x-1/2",
                            isManagement ? "pointer-events-auto" : "pointer-events-none"
                        )}>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-xl font-bold text-gray-900 whitespace-nowrap flex items-center gap-2">
                                    {customTitle || 'الطلاب'}
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-sm transition-colors",
                                        isToday ? "text-blue-500 font-black" : "bg-blue-600 text-white"
                                    )}>
                                        ({filteredStudents?.length || 0})
                                    </span>
                                </h1>

                                {isManagement && (
                                    <div className="relative group w-8 h-8 flex items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
                                        <Calendar size={16} className={cn(isToday ? "text-gray-400" : "text-blue-600")} />
                                        <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-50 w-full h-full"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                )}
                            </div>
                            {!isToday && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 animate-pulse">
                                    تاريخ: {new Date(selectedDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                                </span>
                            )}
                        </div>
                    )}

                    <div className={cn(
                        "flex items-center gap-2 transition-all duration-300",
                        isSearchOpen ? "flex-1" : ""
                    )}>
                        {isSearchOpen ? (
                            <div className="relative flex-1 animate-in slide-in-from-right-4 duration-300">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="ابحث باسم الطالب..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-11 sm:h-12 bg-gray-50 border border-blue-100 rounded-[18px] sm:rounded-[20px] px-10 text-right font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                />
                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                <button
                                    onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 rounded-[18px] sm:rounded-[20px] border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all active:scale-95"
                                >
                                    <Search size={22} />
                                </button>
                                {!groupId && (
                                    <div className="relative">
                                        {isFilterOpen && (
                                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                                        )}
                                        <button
                                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                                            className={cn(
                                                "w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] sm:rounded-[20px] border flex items-center justify-center transition-all active:scale-95 relative z-50",
                                                isFilterOpen || filter !== 'الكل' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-100 text-gray-400 hover:text-blue-600"
                                            )}
                                        >
                                            <SlidersHorizontal size={22} />
                                        </button>

                                        {isFilterOpen && (
                                            <div className="absolute top-[115%] left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => { setFilter('الكل'); setIsFilterOpen(false); }}
                                                    className={cn(
                                                        "w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1",
                                                        filter === 'الكل' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    الكل
                                                </button>
                                                <button
                                                    onClick={() => { setFilter('الأيتام'); setIsFilterOpen(false); }}
                                                    className={cn(
                                                        "w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1",
                                                        filter === 'الأيتام' ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    الأيتام
                                                </button>
                                                <button
                                                    onClick={() => { setFilter('أرقام ناقصة'); setIsFilterOpen(false); }}
                                                    className={cn(
                                                        "w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1",
                                                        filter === 'أرقام ناقصة' ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    أرقام ناقصة
                                                </button>

                                                {/* --- مدمج: فلتر الوقت --- */}
                                                {availableTimes.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                                                        <div className="px-3 py-1 flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase">مواعيد {currentDayName}</span>
                                                            <Clock size={10} className="text-gray-400" />
                                                        </div>
                                                        <button
                                                            onClick={() => { setScheduleFilterTime('الكل'); setIsFilterOpen(false); }}
                                                            className={cn(
                                                                "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                                                                scheduleFilterTime === 'الكل' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            كل الأوقات
                                                        </button>
                                                        {availableTimes.map(time => (
                                                            <button
                                                                key={time}
                                                                onClick={() => {
                                                                    setScheduleFilterTime(time);
                                                                    setIsFilterOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                                                                    scheduleFilterTime === time ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                {time.includes('الساعة') ? time : `ساعة ${time}`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6 mt-4">
                {filteredStudents?.map((student, index) => (
                    <div
                        key={student.id}
                        onClick={() => handleOpenModal(student, 'attendance')}
                        className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 relative group cursor-pointer hover:shadow-md transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                        <User size={20} />
                                    </div>
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm">
                                        {index + 1}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                                    <h3 className="font-bold text-gray-900 leading-tight truncate whitespace-nowrap text-lg">
                                        {student.fullName}
                                    </h3>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium shrink-0">
                                        {getGroupName(student.groupId)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 pt-2 overflow-x-auto no-scrollbar relative w-full">
                            <div className="flex gap-1 shrink-0 transition-opacity duration-300 opacity-100">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAttendance(student, 'present'); }}
                                    className={cn(
                                        "px-6 sm:px-10 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-75 border active:scale-95",
                                        attendanceState[student.id] === 'present'
                                            ? "bg-green-600 text-white border-green-600 shadow-lg"
                                            : "bg-white text-green-600 border-gray-100 hover:bg-green-50"
                                    )}
                                >
                                    حاضر
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAttendance(student, 'absent'); }}
                                    className={cn(
                                        "px-6 sm:px-10 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-75 border active:scale-95",
                                        attendanceState[student.id] === 'absent'
                                            ? "bg-red-500 text-white border-red-500 shadow-lg"
                                            : "bg-white text-red-500 border-gray-100 hover:bg-red-50"
                                    )}
                                >
                                    غياب
                                </button>
                            </div>



                            <div className="h-6 w-px bg-gray-200 shrink-0 mx-0.5" />

                            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-100/50 p-1 rounded-xl border border-gray-50 shrink-0">
                                {user?.role !== 'director' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(student, 'fees'); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-600 transition-colors" title="المالية"><CreditCard size={18} /></button>
                                )}
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const isIqra = groups?.find((g: any) => g.id === student.groupId)?.name?.match(/إقراء|اقراء/);
                                        handleOpenModal(student, isIqra ? 'iqra_courses' : 'exams'); 
                                    }} 
                                    className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-white rounded-lg transition-all" 
                                    title="الاختبارات"
                                >
                                    <BookOpen size={18} />
                                </button>
                                {user?.role === 'teacher' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(student, 'notes'); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors" title="الملاحظات"><FileText size={18} /></button>
                                )}

                                {(user?.role === 'director' || user?.role === 'supervisor') && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); handleCall(student); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors" title="اتصال"><Phone size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleArchive(student); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-colors" title="أرشفة"><Archive size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setStudentToEdit(student); setIsEditModalOpen(true); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors" title="تعديل"><Edit3 size={18} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <AddStudentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                defaultGroupId={groupId}
            />

            <EditStudentModal
                student={studentToEdit}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setStudentToEdit(null);
                }}
            />

            <StudentDetailModal
                student={selectedStudent}
                isOpen={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
                initialTab={selectedTab}
                currentAttendance={selectedStudent ? attendanceState[selectedStudent.id] : undefined}
                onEdit={(s: any) => {
                    setSelectedStudent(null);
                    setStudentToEdit(s);
                    setIsEditModalOpen(true);
                }}
            />
        </div >
    );
}
