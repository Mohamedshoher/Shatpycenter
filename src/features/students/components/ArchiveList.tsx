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
    Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Student } from '@/types';
import StudentDetailModal from './StudentDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ArchiveList() {
    const { data: students, isLoading, restoreStudent, deleteStudent } = useStudents();
    const { data: groups } = useGroups();
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();
    const router = useRouter();

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [filter, setFilter] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // حالة نافذة استعادة طالب (اختيار المجموعة)
    const [restoreTarget, setRestoreTarget] = useState<Student | null>(null);
    const [targetGroupId, setTargetGroupId] = useState<string>('');

    // جلب كافة المصروفات للطلاب المؤرشفين لفحص الدين
    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees'],
        queryFn: async () => {
            const { supabase } = await import('@/lib/supabase');
            const { data } = await supabase.from('fees').select('*');
            return (data || []) as any[];
        }
    });

    // منطق الدين الفعلي: التحقق من وجود أشهر غير مدفوعة منذ التحاقه
    const checkDebt = (student: Student) => {
        if (!student.enrollmentDate) return false;

        const start = new Date(student.enrollmentDate);
        const end = student.archivedDate ? new Date(student.archivedDate) : new Date();

        // جلب قائمة الأشهر التي يجب دفعها
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const target = new Date(end.getFullYear(), end.getMonth(), 1);

        const studentFees = allFees.filter(f => f.student_id === student.id);

        while (current <= target) {
            const monthLabel = current.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

            const isPaid = studentFees.some(f => f.month === monthLabel || f.month === monthKey);
            if (!isPaid) return true; // وجد شهر غير مدفوع

            current.setMonth(current.getMonth() + 1);
        }

        return false;
    };

    const archivedStudents = useMemo(() => {
        return students?.filter(student => {
            const matchesSearch = student.fullName.toLowerCase().startsWith(searchTerm.toLowerCase());
            const isArchived = student.status === 'archived';

            // منطق الفلترة
            let matchesFilter = true;
            if (filter === 'indebted') {
                matchesFilter = checkDebt(student);
            } else if (filter !== 'الكل') {
                matchesFilter = student.groupId === filter;
            }

            return matchesSearch && isArchived && matchesFilter;
        }) || [];
    }, [students, searchTerm, filter, allFees]);

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



    const handleRestoreConfirm = () => {
        if (restoreTarget && targetGroupId) {
            restoreStudent(restoreTarget.id, targetGroupId);
            setRestoreTarget(null);
            setTargetGroupId('');
        }
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
        <div className="space-y-6 pb-24 p-4 md:p-6 text-right">
            {/* رأس الصفحة */}
            <div className="flex items-center justify-between pt-2 gap-4">
                <div className="flex items-center gap-2">
                    <Link
                        href="/students"
                        className="w-12 h-12 bg-blue-50 rounded-[20px] border border-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-95 transition-all shrink-0"
                        title="قائمة الطلاب الحاليين"
                    >
                        <User size={22} />
                    </Link>
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden w-12 h-12 bg-white rounded-[20px] border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0"
                    >
                        <Menu size={22} />
                    </button>
                </div>

                {!isSearchOpen && (
                    <h1 className="text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">
                        أرشيف الطلاب ({archivedStudents?.length || 0})
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
                                className="w-full h-12 bg-gray-50 border border-blue-100 rounded-[20px] px-10 text-right font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                            <button
                                onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-12 h-12 bg-gray-50 rounded-[20px] border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all active:scale-95"
                            >
                                <Search size={22} />
                            </button>
                            <div className="relative">
                                {isFilterOpen && (
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                                )}
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={cn(
                                        "w-12 h-12 rounded-[20px] border flex items-center justify-center transition-all active:scale-95 relative z-50",
                                        isFilterOpen || filter !== 'الكل' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-100 text-gray-400 hover:text-blue-600"
                                    )}
                                >
                                    <SlidersHorizontal size={22} />
                                </button>
                                {isFilterOpen && (
                                    <div className="absolute top-[110%] left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
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
                                            المدينين فقط
                                            <AlertCircle size={14} className={filter === 'indebted' ? "opacity-100" : "opacity-40"} />
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

            {/* شبكة الطلاب */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                {archivedStudents?.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                            <X size={40} />
                        </div>
                        <p className="text-gray-400 font-bold">لا يوجد طلاب في الأرشيف حالياً</p>
                    </div>
                ) : (
                    archivedStudents?.map((student) => {
                        const daysInArchive = getDaysInArchive(student.archivedDate);
                        const isIndebted = checkDebt(student);

                        return (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="bg-white/80 rounded-[32px] p-5 border border-gray-100 flex items-center justify-between hover:shadow-lg hover:shadow-gray-200/50 transition-all group cursor-pointer active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-14 h-14 bg-gray-100 rounded-[22px] flex items-center justify-center text-gray-400 relative overflow-hidden shrink-0">
                                        <User size={28} />
                                        <div className="absolute inset-0 bg-gray-200/30 backdrop-blur-[2px]" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                                            <h3
                                                onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}
                                                className="font-bold text-gray-900 leading-none hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[200px]"
                                            >
                                                {student.fullName}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg shrink-0">
                                                {groups?.find(g => g.id === student.groupId)?.name || 'غير محدد'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg shrink-0">
                                                <Clock size={10} />
                                                منذ {daysInArchive} أيام
                                            </span>
                                            {isIndebted && (
                                                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg animate-pulse shrink-0">
                                                    <AlertCircle size={10} />
                                                    مدين
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRestoreTarget(student);
                                            setTargetGroupId(student.groupId || '');
                                        }}
                                        className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                        title="استعادة الطالب"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    {user?.role === 'director' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`هل أنت متأكد من حذف الطالب ${student.fullName} نهائياً؟ لا يمكن التراجع عن هذه الخطوة.`)) {
                                                    deleteStudent(student.id);
                                                }
                                            }}
                                            className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                            title="حذف نهائي"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
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
                                        {groups?.map((group) => (
                                            <button
                                                key={group.id}
                                                onClick={() => setTargetGroupId(group.id)}
                                                className={cn(
                                                    "w-full p-4 rounded-2xl border text-right font-bold transition-all relative group",
                                                    targetGroupId === group.id
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                                        : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                                                )}
                                            >
                                                {group.name}
                                                {targetGroupId === group.id && <Check size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <Button
                                        onClick={handleRestoreConfirm}
                                        disabled={!targetGroupId}
                                        className="flex-1 h-14 bg-green-600 hover:bg-green-700 rounded-2xl font-bold shadow-lg shadow-green-200 disabled:opacity-50"
                                    >
                                        تأكيد الاستعادة
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setRestoreTarget(null)}
                                        className="flex-1 h-14 rounded-2xl font-bold border-gray-100"
                                    >
                                        إلغاء
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <StudentDetailModal
                student={selectedStudent}
                isOpen={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
                initialTab="attendance"
            />
        </div>
    );
}

