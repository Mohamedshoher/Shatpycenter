"use client";

import { useState } from 'react';
import { useTeachers } from '../hooks/useTeachers';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { deleteTeacher } from '../services/teacherService'; // Assuming this service exists
import {
    UserPlus,
    Search,
    Menu,
    SlidersHorizontal,
    X,
    Phone,
    Briefcase,
    CheckCircle2,
    XCircle,
    TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Teacher } from '@/types';
import TeacherDetailModal from './TeacherDetailModal';
import AddStaffModal from './AddStaffModal';
import { useTeacherAttendance, useAllTeachersAttendance } from '../hooks/useTeacherAttendance';
import { updateTeacherAttendance } from '../services/attendanceService';

export default function TeacherList() {
    const { data: teachers, isLoading } = useTeachers();
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();
    const { data: groups } = useGroups();

    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filter, setFilter] = useState('نشط');
    const [sectionFilter, setSectionFilter] = useState('الكل');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

    const today = new Date();
    const [selectedMonthRaw, setSelectedMonthRaw] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const { data: allTeachersAttendanceMap = {} } = useAllTeachersAttendance(selectedMonthRaw);

    const { updateAttendance, updateAttendanceAsync } = useTeacherAttendance(selectedTeacher?.id, selectedMonthRaw);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTeacher(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            setIsDetailOpen(false);
        }
    });

    const handleEdit = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setIsAddModalOpen(true);
        setIsDetailOpen(false); // Close detail modal if open
    };

    const handleDelete = (teacher: Teacher) => {
        if (confirm(`هل أنت متأكد من حذف الموظف: ${teacher.fullName}؟`)) {
            deleteMutation.mutate(teacher.id);
        }
    };

    const handleOpenDetail = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setIsDetailOpen(true);
    };

    const handleQuickAttendance = (teacherId: string, status: 'present' | 'absent') => {
        const todayDate = new Date().toISOString().split('T')[0];
        updateTeacherAttendance(teacherId, todayDate, status).then(() => {
            queryClient.invalidateQueries({ queryKey: ['all-teachers-attendance', selectedMonthRaw] });
        });
    };

    // دالة توحيد الحروف العربية
    const normalize = (s: string) => s?.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/\s+/g, '').trim() || '';

    // تصفية المعلمين بناءً على البحث والفلتر
    const filteredTeachers = teachers?.filter(teacher => {
        // إذا كان مدرساً، يظهر له صفحته فقط
        if (user?.role === 'teacher') {
            return teacher.id === user.teacherId;
        }

        // إذا كان مشرفاً، يرى نفسه والمدرسين الذين يشرف عليهم في أقسامه
        if (user?.role === 'supervisor') {
            const sections = user.responsibleSections || [];
            if (teacher.id === user.teacherId) return true; // يرى نفسه

            // جلب المجموعات التابعة لأقسام المشرف
            const supervisedGroups = groups?.filter(g =>
                sections.some(section => g.name.includes(section))
            ) || [];

            // المدرسون المشرف عليهم هم من يدرسون هذه المجموعات
            const supervisedTeacherIds = new Set(supervisedGroups.map(g => g.teacherId).filter(Boolean));

            if (!supervisedTeacherIds.has(teacher.id)) return false;
        }

        const normSearch = normalize(searchTerm);
        const normFullName = normalize(teacher.fullName);
        const matchesSearch = normFullName.includes(normSearch);

        // فلتر الحالة
        const matchesStatus = filter === 'الكل' ||
            (filter === 'نشط' && (teacher.status === 'active' || !teacher.status)) ||
            (filter === 'غير نشط' && teacher.status === 'inactive');

        // فلتر الأقسام
        const matchesSection = sectionFilter === 'الكل' ||
            ((teacher as any).responsibleSections || []).includes(sectionFilter);

        return matchesSearch && matchesStatus && matchesSection;
    })?.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 w-full bg-white animate-pulse rounded-[30px] border border-gray-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="pb-24 transition-all duration-500">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="relative flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 relative z-50">
                        {user?.role === 'director' && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 rounded-[18px] sm:rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all shrink-0 cursor-pointer"
                                title="إضافة معلم جديد"
                            >
                                <UserPlus size={22} className="pointer-events-none" />
                            </button>
                        )}
                        <button onClick={toggleSidebar} className="md:hidden w-11 h-11 bg-white rounded-[18px] border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0">
                            <Menu size={22} />
                        </button>
                    </div>

                    {!isSearchOpen && (
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
                            {user?.role === 'teacher' ? 'بياناتي الشخصية' : <>المعلمون <span className="text-blue-500 font-black">({filteredTeachers?.length || 0})</span></>}
                        </h1>
                    )}

                    {user?.role !== 'teacher' && (
                        <div className={cn("flex items-center gap-2 transition-all duration-300", isSearchOpen ? "flex-1" : "")}>
                            {isSearchOpen ? (
                                <div className="relative flex-1 animate-in slide-in-from-right-4 duration-300">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="ابحث باسم المعلم..."
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
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                                            className={cn(
                                                "w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] sm:rounded-[20px] border flex items-center justify-center transition-all active:scale-95",
                                                isFilterOpen || filter !== 'الكل' || sectionFilter !== 'الكل'
                                                    ? "bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/20"
                                                    : "bg-gray-50 border-gray-100 text-gray-400 hover:text-blue-600"
                                            )}
                                        >
                                            <SlidersHorizontal size={22} />
                                        </button>

                                        {isFilterOpen && (
                                            <div className="absolute top-[115%] left-0 w-64 bg-white rounded-[28px] shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase text-right mr-1">الحالة</p>
                                                        <div className="flex flex-wrap gap-2 justify-end">
                                                            {['الكل', 'نشط', 'غير نشط'].map((f) => (
                                                                <button
                                                                    key={f}
                                                                    onClick={() => setFilter(f)}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                                                        filter === f ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                                                    )}
                                                                >
                                                                    {f}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 border-t border-gray-50 pt-3">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase text-right mr-1">القسم</p>
                                                        <div className="flex flex-wrap gap-2 justify-end">
                                                            {['الكل', 'قرآن', 'نور بيان', 'تلقين', 'إقراء'].map((s) => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => setSectionFilter(s)}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                                                        sectionFilter === s ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                                                    )}
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setFilter('الكل');
                                                            setSectionFilter('الكل');
                                                            setIsFilterOpen(false);
                                                        }}
                                                        className="w-full py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        إعادة تعيين الفلاتر
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Teacher Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mt-2 max-w-7xl mx-auto">
                {filteredTeachers?.map((teacher) => (
                    <div
                        key={teacher.id}
                        onClick={() => handleOpenDetail(teacher)}
                        className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex flex-col gap-4 relative group cursor-pointer hover:border-teal-200 transition-all hover:shadow-md"
                    >
                        {/* Top Section */}
                        <div className="flex items-center justify-between group/card">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-500 shrink-0">
                                    <Briefcase size={20} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-800 text-lg group-hover/card:text-teal-600 transition-colors truncate">
                                            {teacher.fullName}
                                        </h3>
                                        <span className={cn(
                                            "shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black",
                                            teacher.status === 'active' ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                                        )}>
                                            {teacher.status === 'active' ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <a
                                href={`tel:${teacher.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-10 h-10 flex items-center justify-center bg-teal-50 text-teal-400 rounded-xl hover:bg-teal-500 hover:text-white transition-all active:scale-90 shadow-sm shrink-0"
                                title="اتصال هاتفي"
                            >
                                <Phone size={18} />
                            </a>
                        </div>

                        {/* Bottom Section: Attendance Status (View only for Teacher) */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                                const todayDay = new Date().getDate();
                                const status = allTeachersAttendanceMap[teacher.id]?.[todayDay];
                                const isAbsent = status === 'absent';

                                if (user?.role !== 'teacher') {
                                    return (
                                        <>
                                            <button
                                                onClick={() => handleQuickAttendance(teacher.id, 'present')}
                                                className={cn(
                                                    "flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all",
                                                    !isAbsent
                                                        ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                                                        : "bg-green-50 text-green-800 hover:bg-green-100"
                                                )}
                                            >
                                                <CheckCircle2 size={14} />
                                                حاضر
                                            </button>
                                            <button
                                                onClick={() => handleQuickAttendance(teacher.id, 'absent')}
                                                className={cn(
                                                    "flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all",
                                                    isAbsent
                                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                                        : "bg-white border border-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100"
                                                )}
                                            >
                                                <XCircle size={14} />
                                                غائب
                                            </button>
                                        </>
                                    );
                                } else {
                                    return (
                                        <div className={cn(
                                            "flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2",
                                            isAbsent ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                                        )}>
                                            {isAbsent ? 'حالة اليوم: غائب' : 'حالة اليوم: حاضر'}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                ))}
            </div>
            {/* نافذة تفاصيل المعلم */}
            <TeacherDetailModal
                teacher={selectedTeacher}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* نافذة إضافة موظف جديد */}
            <AddStaffModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingTeacher(null);
                }}
                initialTeacher={editingTeacher}
            />
        </div>
    );
}
