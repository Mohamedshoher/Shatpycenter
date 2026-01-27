"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
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
    BookOpen
} from 'lucide-react';
import { addToOfflineQueue } from '@/lib/offline-queue';

import AddStudentModal from './AddStudentModal';
import StudentDetailModal from './StudentDetailModal';
import EditStudentModal from './EditStudentModal';
import { cn } from '@/lib/utils';
import { Student } from '@/types';

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

    const myGroups = groups?.filter(g => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        return true;
    }) || [];
    const myGroupsIds = myGroups.map(g => g.id);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [selectedTab, setSelectedTab] = useState('attendance');
    const [filter, setFilter] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [attendanceLoading, setAttendanceLoading] = useState<Record<string, 'present' | 'absent' | null>>({});
    const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | null>>({});

    // جلب حضور اليوم لجميع الطلاب بضغطة واحدة
    const { data: todayAttendance } = useQuery({
        queryKey: ['today-attendance', students?.map(s => s.id)],
        queryFn: async () => {
            if (!students) return {};
            const { getStudentAttendance } = await import('../services/recordsService');
            const today = new Date();
            const dayNum = today.getDate();
            const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            const attendanceMap: Record<string, 'present' | 'absent'> = {};
            const promises = students.map(async (student) => {
                const records = await getStudentAttendance(student.id).catch(() => []);
                const todayRec = records.find(r => r.day === dayNum && r.month === monthKey);
                if (todayRec) {
                    attendanceMap[student.id] = todayRec.status;
                }
            });
            await Promise.all(promises);
            return attendanceMap;
        },
        enabled: !!(students && students.length > 0)
    });

    // تحديث الحالة المحلية عند اكتمال التحميل
    useEffect(() => {
        if (todayAttendance) {
            setAttendanceState(todayAttendance);
        }
    }, [todayAttendance]);

    const getGroupName = (groupId: string | null) => {
        if (!groupId) return '';
        const group = groups?.find(g => g.id === groupId);
        return group ? group.name : '';
    };

    const filteredStudents = students?.filter(student => {
        if (user?.role === 'teacher') {
            if (!student.groupId || !myGroupsIds.includes(student.groupId)) return false;
        }

        const matchesSearch = (student.fullName || '').toLowerCase().startsWith(searchTerm.toLowerCase());
        const matchesGroup = groupId
            ? student.groupId === groupId
            : (filter === 'الكل' || student.groupId === filter);
        const isActive = student.status === 'active';
        return matchesSearch && matchesGroup && isActive;
    })?.sort((a, b) => {
        const groupA = getGroupName(a.groupId);
        const groupB = getGroupName(b.groupId);
        if (groupA !== groupB) return groupA.localeCompare(groupB, 'ar');
        return a.fullName.localeCompare(b.fullName, 'ar');
    });

    const handleOpenModal = (student: Student, tab: string = 'attendance') => {
        setSelectedTab(tab);
        setSelectedStudent(student);
    };

    const handleWhatsApp = (student: Student) => {
        const phone = student.parentPhone.startsWith('01') ? `2${student.parentPhone}` : student.parentPhone;
        window.open(`https://wa.me/${phone}`, '_blank');
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

    const handleAttendance = async (student: Student, status: 'present' | 'absent') => {
        // 1. تحديث الحالة المحلية للزر فوراً
        setAttendanceState(prev => ({ ...prev, [student.id]: status }));

        const today = new Date();
        const day = today.getDate();
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // 2. تحديث الكاش العالمي للحضور فوراً (هذا ما تراه النافذة المنبثقة)
        queryClient.setQueryData(['attendance', student.id], (old: any) => {
            const records = Array.isArray(old) ? old : [];
            const filtered = records.filter((r: any) => !(r.day === day && r.month === monthKey));
            return [...filtered, { studentId: student.id, day, month: monthKey, status }];
        });

        // 3. إرسال حدث للمزامنة الإضافية
        window.dispatchEvent(new CustomEvent('updateAttendance', {
            detail: { studentId: student.id, day, status, month: monthKey }
        }));

        // 4. الحفظ النهائي في قاعدة البيانات في الخلفية
        try {
            const { addAttendanceRecord } = await import('../services/recordsService');
            await addAttendanceRecord({
                studentId: student.id,
                day,
                month: monthKey,
                status
            });
            // إعادة المزامنة لتأكيد البيانات
            queryClient.invalidateQueries({ queryKey: ['attendance', student.id] });
            queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
        } catch (error) {
            console.error('Error saving attendance, adding to offline queue:', error);
            // بدلاً من حذف الحالة، نضيفها لزمام المزامنة الأوفلاين
            addToOfflineQueue('attendance', {
                studentId: student.id,
                day,
                month: monthKey,
                status
            });

            // لا نحذف الحالة من الواجهة، ستبقى خضراء/حمراء وكأنها حُفظت
        }
    };

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
        <div className="space-y-4 md:space-y-6 pb-24 p-3 md:p-6 transition-all duration-500">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl -mx-3 px-3 py-4 border-b border-gray-100 mb-2 shadow-sm">
                <div className="relative flex items-center justify-between gap-4">
                    <div className="relative z-50 flex items-center gap-2">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-12 h-12 bg-blue-600 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform shrink-0"
                            title="إضافة طالب جديد"
                        >
                            <UserPlus size={22} />
                        </button>

                        <button
                            onClick={toggleSidebar}
                            className="md:hidden w-12 h-12 bg-white rounded-[20px] border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0"
                        >
                            <Menu size={22} />
                        </button>
                    </div>

                    {!isSearchOpen && (
                        <h1 className="text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
                            {customTitle || 'الطلاب'} ({filteredStudents?.length || 0})
                        </h1>
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
                                {!groupId && (
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
                                            <div className="absolute top-[110%] left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 min-w-[150px] animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => { setFilter('الكل'); setIsFilterOpen(false); }}
                                                    className={cn(
                                                        "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors mb-1",
                                                        filter === 'الكل' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    الكل
                                                </button>
                                                {myGroups.map((group) => (
                                                    <button
                                                        key={group.id}
                                                        onClick={() => { setFilter(group.id); setIsFilterOpen(false); }}
                                                        className={cn(
                                                            "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                                                            filter === group.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {group.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
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
                                <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg leading-tight truncate whitespace-nowrap">
                                        {student.fullName}
                                    </h3>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium shrink-0">
                                        {getGroupName(student.groupId)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 pt-2 overflow-x-auto no-scrollbar relative">
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAttendance(student, 'present'); }}
                                    className={cn(
                                        "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-200 border active:scale-95",
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
                                        "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-200 border active:scale-95",
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
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(student, 'fees'); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-600 transition-colors" title="المالية"><CreditCard size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(student, 'exams'); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors" title="الاختبارات"><BookOpen size={18} /></button>

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
            />
        </div >
    );
}
