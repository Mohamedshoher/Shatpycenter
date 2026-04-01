"use client";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useStudents } from '../hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
    Search,
    RotateCcw,
    Trash2,
    Menu,
    SlidersHorizontal,
    X,
    User,
    ArrowRight,
    Clock,
    AlertCircle,
    Check,
    MessageCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn, tieredSearchFilter, getWhatsAppUrl } from '@/lib/utils';
import { Student } from '@/types';
import StudentDetailModal from './StudentDetailModal';
import EditStudentModal from './EditStudentModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ArchiveList() {
    const { data: students, isLoading, restoreStudent, deleteStudent } = useStudents();
    const { data: groups } = useGroups();
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();
    const router = useRouter();

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [filter, setFilter] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [daysInArchiveFilter, setDaysInArchiveFilter] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // حالة نافذة استعادة طالب (اختيار المجموعة)
    const [restoreTarget, setRestoreTarget] = useState<Student | null>(null);
    const [targetGroupId, setTargetGroupId] = useState<string>('');
    const [isRestoring, setIsRestoring] = useState(false);

    // جلب كافة المصروفات للطلاب المؤرشفين لفحص الدين
    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees', students?.filter(s => s.status === 'archived').length],
        queryFn: async () => {
            if (!students) return [];
            const archivedIds = students.filter(s => s.status === 'archived').map(s => s.id);
            if (archivedIds.length === 0) return [];

            const { supabase } = await import('@/lib/supabase');
            let allData: any[] = [];

            const chunkSize = 100;
            for (let i = 0; i < archivedIds.length; i += chunkSize) {
                const chunk = archivedIds.slice(i, i + chunkSize);
                let from = 0;
                const step = 1000;
                while (true) {
                    const { data, error } = await supabase.from('fees').select('*').in('student_id', chunk).range(from, from + step - 1);
                    if (error || !data || data.length === 0) break;
                    allData = [...allData, ...data];
                    if (data.length < step) break;
                    from += step;
                }
            }
            return allData;
        },
        enabled: !!students
    });

    // جلب كافة سجلات الحضور لفحص استحقاق الدين
    const { data: allAttendance = [] } = useQuery({
        queryKey: ['all-attendance', students?.filter(s => s.status === 'archived').length],
        queryFn: async () => {
            if (!students) return [];
            const archivedIds = students.filter(s => s.status === 'archived').map(s => s.id);
            if (archivedIds.length === 0) return [];

            const { supabase } = await import('@/lib/supabase');
            let allData: any[] = [];

            const chunkSize = 100;
            for (let i = 0; i < archivedIds.length; i += chunkSize) {
                const chunk = archivedIds.slice(i, i + chunkSize);
                let from = 0;
                const step = 1000;
                while (true) {
                    const { data, error } = await supabase
                        .from('attendance')
                        .select('student_id, month_key, status, date')
                        .in('student_id', chunk)
                        .range(from, from + step - 1);
                    if (error || !data || data.length === 0) break;
                    allData = [...allData, ...data];
                    if (data.length < step) break;
                    from += step;
                }
            }
            return allData;
        },
        enabled: !!students
    });

    // منطق الدين المتطور: يعتمد على عدد أيام الحضور في الشهر
    const calculateDebt = (student: Student) => {
        const studentFees = allFees.filter(f => f.student_id === student.id);
        const studentAttendance = allAttendance.filter(a => a.student_id === student.id);

        let startDateStr = student.enrollmentDate;
        if (!startDateStr && studentAttendance.length > 0) {
            startDateStr = studentAttendance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date;
        }

        if (!startDateStr) return { isIndebted: false, label: '', amount: 0 };

        const start = new Date(startDateStr);
        const end = student.archivedDate ? new Date(student.archivedDate) : new Date();

        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const target = new Date(end.getFullYear(), end.getMonth(), 1);

        let totalMonthDebt = 0;

        while (current <= target) {
            const monthLabel = current.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

            // حساب أيام الحضور في هذا الشهر
            const monthAttendanceCount = studentAttendance.filter(a => {
                const recordDate = new Date(a.date);
                const recordMonthKey = a.month_key || `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
                return recordMonthKey === monthKey && a.status === 'present';
            }).length;

            let monthDebtAmount = 0;

            if (monthAttendanceCount >= 10) {
                monthDebtAmount = 1;
            } else if (monthAttendanceCount >= 5) {
                monthDebtAmount = 0.5;
            }

            if (monthDebtAmount > 0) {
                const isPaid = studentFees.some(f => f.month === monthLabel || f.month === monthKey);
                if (!isPaid) {
                    totalMonthDebt += monthDebtAmount;
                }
            }

            current.setMonth(current.getMonth() + 1);
        }

        let label = '';
        if (totalMonthDebt === 0.5) label = 'مدين بنصف شهر';
        else if (totalMonthDebt === 1) label = 'مدين بشهر';
        else if (totalMonthDebt > 1) label = `مدين (${totalMonthDebt} أشهر)`;

        return {
            isIndebted: totalMonthDebt > 0,
            amount: totalMonthDebt,
            label
        };
    };

    const archivedStudents = useMemo(() => {
        if (!students) return [];

        // حساب الدين مسبقاً لكل طالب لتجنب التكرار وللتمكن من الترتيب
        const withDebt = students
            .filter(student => student.status === 'archived')
            .map(student => ({
                ...student,
                debtInfo: calculateDebt(student)
            }));

        const baseFiltered = withDebt.filter(student => {
            const { debtInfo } = student;

            let matchesFilter = true;
            if (filter === 'indebted') {
                matchesFilter = debtInfo.isIndebted;
            } else if (filter === 'half_indebted') {
                matchesFilter = debtInfo.amount === 0.5;
            } else if (filter === 'full_indebted') {
                matchesFilter = debtInfo.amount >= 1;
            } else if (filter !== 'الكل') {
                matchesFilter = student.groupId === filter;
            }

            if (matchesFilter && daysInArchiveFilter > 0) {
                // استخدام تاريخ الأرشفة، أو تاريخ التحديث كبديل، أو تاريخ اليوم كآخر خيار
                const archiveDateStr = student.archivedDate || (student as any).updated_at;
                if (!archiveDateStr) {
                    matchesFilter = false; 
                } else {
                    const start = new Date(archiveDateStr);
                    const today = new Date();
                    
                    // تحويل كلاهما لبداية اليوم للحصول على فرق دقيق بالأيام
                    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    
                    const diffTime = t.getTime() - s.getTime();
                    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                    
                    matchesFilter = diffDays >= daysInArchiveFilter;
                }
            }

            return matchesFilter;
        });

        // ترتيب المدينين أولاً
        baseFiltered.sort((a, b) => {
            if (a.debtInfo.isIndebted && !b.debtInfo.isIndebted) return -1;
            if (!a.debtInfo.isIndebted && b.debtInfo.isIndebted) return 1;
            if (b.debtInfo.amount !== a.debtInfo.amount) return b.debtInfo.amount - a.debtInfo.amount;
            return 0;
        });

        return tieredSearchFilter(baseFiltered, searchTerm, (s) => s.fullName);
    }, [students, searchTerm, filter, allFees, allAttendance, daysInArchiveFilter]);

    // دالة حساب عدد الأيام في الأرشيف بدقة
    const getDaysInArchive = (archivedDate?: string) => {
        if (!archivedDate) return 0;
        const start = new Date(archivedDate);
        start.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays === 2) return 'منذ يومين';
        return `منذ ${diffDays} أيام`;
    };

    const handleRestoreConfirm = async () => {
        if (restoreTarget && targetGroupId) {
            setIsRestoring(true);
            try {
                await restoreStudent(restoreTarget.id, targetGroupId);
                setRestoreTarget(null);
                setTargetGroupId('');
            } finally {
                setIsRestoring(false);
            }
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        if (confirm(`هل أنت متأكد من حذف ${selectedIds.size} طلاب نهائياً؟`)) {
            for (const id of selectedIds) {
                await deleteStudent(id);
            }
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 w-full bg-white/50 animate-pulse rounded-[32px] border border-gray-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="pb-24 transition-all duration-500">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="relative flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-1.5 relative z-50">
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-[16px] border border-blue-100 min-w-[90px] shrink-0">
                            <input 
                                type="number" 
                                min="0"
                                value={daysInArchiveFilter || ''}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setDaysInArchiveFilter(isNaN(val) ? 0 : val);
                                }}
                                placeholder="0"
                                className="w-10 h-8 bg-white border border-blue-200 rounded-lg text-center font-black text-xs text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] font-black text-blue-400 whitespace-nowrap ml-1">يوم+</span>
                        </div>
                        {archivedStudents.length > 0 && user?.role === 'director' && (
                            <button
                                onClick={() => {
                                    if (selectedIds.size === archivedStudents.length) setSelectedIds(new Set());
                                    else setSelectedIds(new Set(archivedStudents.map(s => s.id)));
                                }}
                                className={cn(
                                    "px-3 h-11 sm:h-12 rounded-[18px] sm:rounded-[20px] font-black text-[10px] transition-all border",
                                    selectedIds.size === archivedStudents.length 
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                                        : "bg-white border-gray-100 text-gray-400 hover:text-blue-600 shadow-sm"
                                )}
                            >
                                {selectedIds.size === archivedStudents.length ? 'إلغاء الكل' : 'تحديد الكل'}
                            </button>
                        )}
                    </div>

                    {!isSearchOpen && (
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
                            أرشيف الطلاب <span className="text-blue-500 font-black">({archivedStudents?.length || 0})</span>
                        </h1>
                    )}

                    <div className={cn("flex items-center gap-2 transition-all duration-300", isSearchOpen ? "flex-1" : "")}>
                        {isSearchOpen ? (
                            <div className="relative flex-1 animate-in slide-in-from-right-4 duration-300">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="ابحث في الأرشيف..."
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
                                {selectedIds.size > 0 && user?.role === 'director' && (
                                    <button
                                        onClick={handleBatchDelete}
                                        className="h-11 sm:h-12 px-4 bg-red-50 text-red-600 border border-red-100 rounded-[18px] sm:rounded-[20px] flex items-center gap-2 font-black text-xs animate-in zoom-in"
                                    >
                                        <Trash2 size={18} />
                                        <span>حذف ({selectedIds.size})</span>
                                    </button>
                                )}
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
                                        <div className="absolute top-[115%] left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 min-w-[170px] animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">الحالة العامة</div>
                                            <button
                                                onClick={() => { setFilter('الكل'); setIsFilterOpen(false); }}
                                                className={cn("w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1", filter === 'الكل' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50")}
                                            >
                                                الكل
                                            </button>
                                            <button
                                                onClick={() => { setFilter('indebted'); setIsFilterOpen(false); }}
                                                className={cn("w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 flex items-center justify-between", filter === 'indebted' ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50")}
                                            >
                                                المدينين (الكل)
                                                <AlertCircle size={14} className={filter === 'indebted' ? "opacity-100" : "opacity-40"} />
                                            </button>
                                            <button
                                                onClick={() => { setFilter('half_indebted'); setIsFilterOpen(false); }}
                                                className={cn("w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 flex items-center justify-between", filter === 'half_indebted' ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50")}
                                            >
                                                مدين (نصف شهر)
                                                <AlertCircle size={14} className={filter === 'half_indebted' ? "opacity-100" : "opacity-40"} />
                                            </button>
                                            <button
                                                onClick={() => { setFilter('full_indebted'); setIsFilterOpen(false); }}
                                                className={cn("w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 flex items-center justify-between", filter === 'full_indebted' ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50")}
                                            >
                                                مدين (شهر كامل)
                                                <AlertCircle size={14} className={filter === 'full_indebted' ? "opacity-100" : "opacity-40"} />
                                            </button>

                                            <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-y border-gray-50 my-1">المجموعات</div>
                                            <div className="max-h-48 overflow-y-auto pr-1">
                                                {groups?.map((group) => (
                                                    <button
                                                        key={group.id}
                                                        onClick={() => { setFilter(group.id); setIsFilterOpen(false); }}
                                                        className={cn("w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors", filter === group.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50")}
                                                    >
                                                        {group.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 sm:px-6 mt-4">
                {archivedStudents?.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                            <X size={40} />
                        </div>
                        <p className="text-gray-400 font-bold">لا يوجد طلاب في الأرشيف مطابقين للبحث</p>
                    </div>
                ) : (
                    archivedStudents?.map((student) => {
                        const daysInArchive = getDaysInArchive(student.archivedDate);
                        const debtInfo = student.debtInfo;

                        return (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 relative group cursor-pointer hover:shadow-md transition-all active:scale-[0.99] flex flex-col gap-1"
                            >
                                {/* السطر الأول: الاسم والمجموعة */}
                                <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={(e) => toggleSelect(student.id, e)}
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all border shrink-0",
                                                    selectedIds.has(student.id) ? "bg-red-500 border-red-600 text-white shadow-lg" : "bg-gray-50 border-gray-100 text-gray-400"
                                                )}
                                            >
                                                {selectedIds.has(student.id) ? <Check size={18} strokeWidth={3} /> : <User size={20} />}
                                            </div>
                                            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                                <h3 className="font-bold text-gray-900 truncate text-lg sm:text-xl">
                                                    {student.fullName}
                                                </h3>
                                            {debtInfo.isIndebted && (
                                                <span className="text-[10px] text-red-600 font-black bg-red-50 px-2 py-0.5 rounded-md border border-red-100 shrink-0">
                                                    مدين
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 shrink-0">
                                                {groups?.find(g => g.id === student.groupId)?.name || 'غير محدد'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* السطر الثاني: مدة الأرشفة، الدين، وأزرار التحكم */}
                                <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] sm:text-xs text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100/50">
                                            <Clock size={12} />
                                            {daysInArchive}
                                        </span>
                                        {debtInfo.isIndebted && (
                                            <span className="text-[10px] sm:text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-100/50">
                                                <AlertCircle size={12} />
                                                {debtInfo.label}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                        {debtInfo.isIndebted && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const phone = student.parentPhone || student.studentPhone || '';
                                                    const message = `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب/ة: *${student.fullName}*\nنود إعلامكم أن الطالب مدين بـ *${debtInfo.label}* كرسوم متأخرة.\nيرجى المبادرة بالسداد وشكراً لتعاونكم مركز الشاطبي لتحفيظ القرآن الكريم.`;
                                                    window.open(getWhatsAppUrl(phone, message), '_blank');
                                                }}
                                                className="w-9 h-9 flex items-center justify-center bg-white text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all active:scale-95 shadow-sm border border-gray-100"
                                                title="مراسلة عبر واتساب"
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRestoreTarget(student);
                                                setTargetGroupId(student.groupId || '');
                                            }}
                                            className="w-9 h-9 flex items-center justify-center bg-white text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all active:scale-95 shadow-sm border border-gray-100"
                                            title="استعادة"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        {user?.role === 'director' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`هل أنت متأكد من حذف الطالب ${student.fullName} نهائياً؟`)) {
                                                        deleteStudent(student.id);
                                                    }
                                                }}
                                                className="w-9 h-9 flex items-center justify-center bg-white text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm border border-gray-100"
                                                title="حذف"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* نافذة اختيار المجموعة عند الاستعادة */}
            <AnimatePresence>
                {restoreTarget && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
                            onClick={() => setRestoreTarget(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[40px] p-8 shadow-2xl z-[201]"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-green-50 rounded-[30px] flex items-center justify-center text-green-600 mx-auto">
                                    <RotateCcw size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-gray-900">استعادة الطالب</h2>
                                    <p className="text-sm text-gray-500 font-medium px-4">
                                        يرجى اختيار المجموعة التي سيتم إرجاع الطالب <span className="text-green-600 font-bold">{restoreTarget.fullName}</span> إليها
                                    </p>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <label className="text-[12px] font-bold text-gray-400 block text-right pr-2">اختر المجموعة</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {[...(groups || [])]
                                            .sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'ar'))
                                            .map((group) => {
                                                const isSelected = targetGroupId && group.id && String(targetGroupId) === String(group.id);
                                                return (
                                                    <button
                                                        key={group.id}
                                                        type="button"
                                                        onClick={() => setTargetGroupId(group.id)}
                                                        className={cn(
                                                            "w-full min-h-[56px] p-4 rounded-2xl border text-right font-black transition-all relative flex items-center justify-between",
                                                            isSelected
                                                                ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200"
                                                                : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50 active:scale-95"
                                                        )}
                                                    >
                                                        <span className={cn("truncate ml-8", isSelected ? "text-white" : "text-gray-900")}>
                                                            {group.name && group.name.trim() !== "" ? group.name : `مجموعة غير مسمى (${group.id.slice(0, 4)})`}
                                                        </span>
                                                        {isSelected && <Check size={20} strokeWidth={3} className="shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={handleRestoreConfirm}
                                        className={cn(
                                            "flex-1 h-14 rounded-2xl font-black flex items-center justify-center transition-all",
                                            !targetGroupId || isRestoring
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-green-600 text-white shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95"
                                        )}
                                    >
                                        {isRestoring ? "جاري الاستعادة..." : "تأكيد الاستعادة"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRestoreTarget(null)}
                                        className="flex-1 h-14 rounded-2xl font-black border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
                initialTab="attendance"
                onEdit={(s: any) => {
                    setSelectedStudent(null);
                    setStudentToEdit(s);
                    setIsEditModalOpen(true);
                }}
            />
        </div>
    );
}

