"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import { Group } from '@/types';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import { getAllAttendanceForMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Edit2 from 'lucide-react/dist/esm/icons/edit-2'
import Check from 'lucide-react/dist/esm/icons/check'
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import Search from 'lucide-react/dist/esm/icons/search';
import Link from 'next/link';
import { cn, tieredSearchFilter } from '@/lib/utils';
import { FadeIn } from '@/components/ui/transition';
import dynamic from 'next/dynamic';

const AddGroupModal = dynamic(() => import('@/features/groups/components/AddGroupModal'), { ssr: false });
const EditGroupModal = dynamic(() => import('@/features/groups/components/EditGroupModal'), { ssr: false });
const ManageGroupsModal = dynamic(() => import('@/features/groups/components/ManageGroupsModal'), { ssr: false });


export default function GroupsPage() {
    const queryClient = useQueryClient();

    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: () => getGroups()
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: () => getTeachers()
    });

    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: () => getStudents()
    });

    const { data: attendanceMap } = useQuery({
        queryKey: ['attendance-month-summary'],
        queryFn: async () => {
            const today = new Date();
            const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            return getAllAttendanceForMonth(monthKey);
        }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filters, setFilters] = useState<string[]>(['الكل']);

    // تبويبات القسم (تلقين / نور بيان / قرآن) للتنقل بينها بدل ما تختلط كل المجموعات مع بعض.
    // مجموعات التجويد مالهاش تبويب لوحدها، بتظهر تحت مجموعات القرآن داخل نفس تبويب "قرآن"
    // حتى يفضل صف التبويبات سطر واحد على عرض الهاتف
    const CATEGORY_TABS = ['الكل', 'تلقين', 'نور بيان', 'قرآن'];
    // أسماء مختصرة تُعرض على التبويب فقط (المطابقة الفعلية بالاسم الكامل في CATEGORY_TABS)
    const CATEGORY_TAB_LABELS: Record<string, string> = { 'نور بيان': 'نور' };
    const [categoryTab, setCategoryTab] = useState<string>('الكل');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
    
    // Group Edit States
    const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<Group | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editTeacherId, setEditTeacherId] = useState('');

    const [sortBy, setSortBy] = useState<'name' | 'studentCount' | 'attendance'>('name');
    const { user } = useAuthStore();

    // Mutations
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Group> }) => updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setEditingGroupId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
        }
    });

    const handleDelete = (id: string, count: number) => {
        if (count > 0) {
            alert('لا يمكن حذف مجموعة تحتوي على طلاب نشطين. يرجى نقل الطلاب أولاً.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذه المجموعة نهائياً؟')) {
            deleteMutation.mutate(id);
        }
    };

    const handleUpdateTeacher = (groupId: string) => {
        const selectedTeacher = teachers?.find(t => t.id === editTeacherId);
        updateMutation.mutate({
            id: groupId,
            data: {
                teacherId: editTeacherId || null,
                teacher: selectedTeacher?.fullName || 'غير محدد'
            }
        });
    };

    // تحسين بيانات المجموعات بإضافة اسم المعلم وعدد الطلاب ولون
    const enhancedGroups = useMemo(() => {
        if (!groups) return [];

        return groups.map(group => {
            const teacher = teachers?.find(t => t.id === group.teacherId);
            const groupStudents = students?.filter(s => s.groupId === group.id && s.status === 'active') || [];
            const studentCount = groupStudents.length;

            // حساب نسبة الحضور
            let attendancePercentage = 0;
            if (attendanceMap && studentCount > 0) {
                let totalPresent = 0;
                let totalRecords = 0;

                groupStudents.forEach(student => {
                    const studentAttendance = attendanceMap[student.id] || [];
                    studentAttendance.forEach(rec => {
                        totalRecords++;
                        if (rec.status === 'present') totalPresent++;
                    });
                });

                if (totalRecords > 0) {
                    attendancePercentage = Math.round((totalPresent / totalRecords) * 100);
                }
            }

            // تحديد اللون بناءً على اسم المجموعة
            let color = 'bg-gray-100 text-gray-600';
            if (group.name.includes('قرآن')) color = 'bg-blue-100 text-blue-600';
            else if (group.name.includes('تلقين')) color = 'bg-green-100 text-green-600';
            else if (group.name.includes('نور بيان')) color = 'bg-orange-100 text-orange-600';
            else if (group.name.includes('تجويد')) color = 'bg-purple-100 text-purple-600';


            return {
                ...group,
                teacher: teacher?.fullName || 'غير محدد',
                count: studentCount,
                attendancePercentage,
                color
            };
        });
    }, [groups, teachers, students, attendanceMap]);

    // مجموعات المستخدم المسموح له برؤيتها فقط (قبل تطبيق تبويب القسم أو فلاتر الحضور)
    const roleScopedGroups = useMemo(() => {
        return enhancedGroups.filter(group => {
            // إذا كان مدرساً، يظهر له مجموعاته فقط
            if (user?.role === 'teacher') {
                if (group.teacherId !== user.teacherId) return false;
            }

            // إذا كان مشرفاً، يظهر له مجموعات الأقسام المسئول عنها فقط
            if (user?.role === 'supervisor') {
                const sections = user.responsibleSections || [];
                if (sections.length > 0) {
                    const isResponsible = sections.some(section => group.name.includes(section));
                    if (!isResponsible) return false;
                }
            }

            return true;
        });
    }, [enhancedGroups, user]);

    // مجموعات التجويد تُعتبر جزءاً من تبويب "قرآن" (تظهر تحتها) بدل تبويب مستقل
    const matchesCategoryTab = (groupName: string, cat: string) =>
        cat === 'قرآن' ? (groupName.includes('قرآن') || groupName.includes('تجويد')) : groupName.includes(cat);

    // عدد مجموعات كل قسم لعرضه كرقم على كل تبويب
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        CATEGORY_TABS.forEach(cat => {
            counts[cat] = cat === 'الكل'
                ? roleScopedGroups.length
                : roleScopedGroups.filter(g => matchesCategoryTab(g.name, cat)).length;
        });
        return counts;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleScopedGroups]);

    const filteredGroups = (() => {
        const baseFiltered = roleScopedGroups.filter(group => {
            if (categoryTab !== 'الكل' && !matchesCategoryTab(group.name, categoryTab)) return false;

            const matchesFilter = (() => {
                if (filters.includes('الكل')) {
                    return true;
                }

                return filters.some(f => {
                    if (f === 'حضور ممتاز') return group.attendancePercentage >= 90;
                    if (f === 'حضور ضعيف') return group.attendancePercentage > 0 && group.attendancePercentage < 75;
                    return false;
                });
            })();

            return matchesFilter;
        });

        // تطبيق البحث المتدرج على المجموعات (باسم المجموعة أو اسم المعلم)
        const finalResults = tieredSearchFilter(baseFiltered, searchTerm, (g) => `${g.name} ${g.teacher}`);

        return finalResults.sort((a, b) => {
            // داخل تبويب "قرآن": مجموعات القرآن أولاً، ثم التجويد تحتها
            if (categoryTab === 'قرآن') {
                const aIsTajweed = a.name.includes('تجويد') ? 1 : 0;
                const bIsTajweed = b.name.includes('تجويد') ? 1 : 0;
                if (aIsTajweed !== bIsTajweed) return aIsTajweed - bIsTajweed;
            }
            if (sortBy === 'studentCount') return b.count - a.count;
            if (sortBy === 'attendance') return b.attendancePercentage - a.attendancePercentage;
            return a.name.localeCompare(b.name, 'ar');
        });
    })();

    const activeSortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return teachers
            .filter(t => t.status === 'active')
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }, [teachers]);

    return (
        <div className="pb-32 transition-all duration-500">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
                    {/* Controls Row - Left */}
                    <div className="flex items-center gap-2">
                        {user?.role !== 'teacher' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="w-11 h-11 bg-purple-600 text-white rounded-[16px] flex items-center justify-center hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                                    title="إضافة مجموعة جديدة"
                                >
                                    <Plus size={22} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Groups Count - Center */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/50 px-4 h-11 rounded-[16px] border border-purple-100/50 shadow-sm pointer-events-none transition-all duration-300">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest hidden sm:inline">المجموعات</span>
                        <span className="text-xl font-black text-purple-600 font-sans">{filteredGroups?.length || 0}</span>
                    </div>

                    {/* Filters - Right */}
                    <div className="flex items-center gap-2 flex-1 justify-end max-w-2xl">
                                <div key="controls" className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsSearchOpen((prev) => {
                                            const next = !prev;
                                            if (!next) setSearchTerm('');
                                            return next;
                                        })}
                                        className={cn(
                                            "w-11 h-11 bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-purple-500 transition-all shadow-sm active:scale-95",
                                            isSearchOpen ? "border-purple-500" : "hover:border-purple-200"
                                        )}
                                        title="بحث باسم المجموعة أو المدرس"
                                    >
                                        <Search size={18} />
                                    </button>
                                    {user?.role !== 'teacher' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsConfigDropdownOpen(!isConfigDropdownOpen)}
                                                className={cn(
                                                    "h-11 px-4 bg-white border border-gray-100 rounded-[16px] flex items-center gap-2 text-gray-600 font-bold transition-all shadow-sm active:scale-95",
                                                    isConfigDropdownOpen ? "border-purple-500" : "hover:border-purple-200"
                                                )}
                                            >
                                                <SlidersHorizontal size={18} className="text-purple-500" />
                                                <span className="text-xs hidden sm:inline">فرز وترتيب</span>
                                                <ChevronDown size={14} className={cn("transition-transform duration-300", isConfigDropdownOpen && "rotate-180")} />
                                            </button>

                                            <FadeIn show={isConfigDropdownOpen}>
                                                <div className="absolute top-[120%] left-0 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
                                                        <div className="px-4 py-2 text-[10px] font-black tracking-widest text-gray-400 border-b border-gray-50 uppercase">الحضور</div>
                                                        {['الكل', 'حضور ممتاز', 'حضور ضعيف'].map((type) => (
                                                            <button
                                                                key={type}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (type === 'الكل') {
                                                                        setFilters(['الكل']);
                                                                    } else {
                                                                        setFilters(prev => {
                                                                            const newFilters = prev.filter(f => f !== 'الكل');
                                                                            if (newFilters.includes(type)) {
                                                                                const updated = newFilters.filter(f => f !== type);
                                                                                return updated.length === 0 ? ['الكل'] : updated;
                                                                            } else {
                                                                                return [...newFilters, type];
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-2 text-right text-xs font-bold transition-all flex items-center justify-between",
                                                                    filters.includes(type) ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                {type}
                                                                {filters.includes(type) && <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                                                            </button>
                                                        ))}

                                                        <div className="px-4 py-2 mt-1 text-[10px] font-black tracking-widest text-gray-400 border-b border-gray-50 uppercase border-t">الترتيب</div>
                                                        {[
                                                            { id: 'name', label: 'الترتيب الأبجدي' },
                                                            { id: 'studentCount', label: 'عدد الطلاب' },
                                                            { id: 'attendance', label: 'نسبة الحضور' }
                                                        ].map((sortOption) => (
                                                            <button
                                                                key={sortOption.id}
                                                                onClick={() => {
                                                                    setSortBy(sortOption.id as 'name' | 'studentCount' | 'attendance');
                                                                    setIsConfigDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-2 text-right text-xs font-bold transition-all flex items-center justify-between",
                                                                    sortBy === sortOption.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                {sortOption.label}
                                                                {sortBy === sortOption.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                            </FadeIn>
                                        </div>
                                    )}
                                </div>
                    </div>
                </div>

                {isSearchOpen && (
                    <div className="max-w-7xl mx-auto mt-3 relative">
                        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            autoFocus
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ابحث باسم المجموعة أو اسم المدرس..."
                            className="w-full h-11 bg-white border border-purple-100 rounded-[16px] pr-11 pl-4 text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>
                )}

                {/* تبويبات الأقسام: تلقين / نور بيان / قرآن، كل قسم لوحده حتى ما يختلطوش ببعض.
                    عدد أعمدة = عدد التبويبات (grid) حتى يستحيل انكسارهم لسطر تاني مهما ضاقت الشاشة،
                    وأسماء مختصرة + خط صغير حتى تتسع كلها بجانب بعض */}
                <div className="max-w-7xl mx-auto mt-3 grid grid-cols-4 gap-1">
                    {CATEGORY_TABS.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoryTab(cat)}
                            className={cn(
                                "min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-xl text-[10px] font-black transition-all border",
                                categoryTab === cat
                                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                                    : "bg-white border-gray-100 text-gray-500 hover:border-purple-200 hover:text-purple-600"
                            )}
                        >
                            <span className="truncate">{CATEGORY_TAB_LABELS[cat] ?? cat}</span>
                            <span className={cn(
                                "shrink-0 text-[8px] px-1 py-0.5 rounded-full font-bold",
                                categoryTab === cat ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"
                            )}>
                                {categoryCounts[cat] ?? 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 mt-2">
                {/* Main Dynamic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-32 bg-white rounded-[32px] animate-pulse shadow-sm" />
                        ))
                    ) : (
                        filteredGroups?.map((group) => (
                            <div
                                key={group.id}
                                className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-4 hover:shadow-xl hover:shadow-purple-500/5 transition-all group relative overflow-hidden"
                            >
                                    <div className="flex justify-between items-start gap-2 relative">
                                        <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                                            <h3 className="font-black text-[#1e293b] text-lg group-hover:text-purple-600 transition-colors truncate">
                                                {group.name}
                                            </h3>
                                        </Link>
                                        <div className="flex items-center gap-2 shrink-0 z-10">
                                            {user?.role === 'director' && (
                                                <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100 shadow-sm transition-all">
                                                    <button 
                                                        onClick={() => setSelectedGroupToEdit(group)} 
                                                        className="p-1.5 text-blue-600 hover:bg-white rounded-md transition-colors" 
                                                        title="تعديل بيانات المجموعة"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(group.id, group.count)} 
                                                        className="p-1.5 text-red-500 hover:bg-white rounded-md transition-colors" 
                                                        title="حذف المجموعة"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <span className={cn("px-2 py-0.5 rounded-[8px] text-[10px] font-black uppercase tracking-wider", group.color)}>
                                                {group.count} طلاب
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        {editingGroupId === group.id ? (
                                            <div className="flex items-center gap-1 w-full relative z-10">
                                                <select
                                                    value={editTeacherId}
                                                    onChange={(e) => setEditTeacherId(e.target.value)}
                                                    className="flex-1 h-8 bg-gray-50 border border-gray-200 rounded-lg px-2 text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="">اختر مدرساً</option>
                                                    {activeSortedTeachers.map((t) => (
                                                        <option key={t.id} value={t.id}>{t.fullName}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => handleUpdateTeacher(group.id)} className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors shrink-0">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setEditingGroupId(null)} className="w-8 h-8 bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors shrink-0">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-col text-right min-w-0">
                                                    <span className="text-[10px] font-black text-indigo-400 mb-0.5">⏰ {Number(group.hours) || 4} ساعات/يوم</span>
                                                    <span className="text-base font-bold text-gray-500 truncate leading-tight">{group.teacher}</span>
                                                </div>

                                                {group.count > 0 && attendanceMap && (
                                                    <span className={cn(
                                                        "text-[10px] font-black px-3 py-1 rounded-full border shrink-0",
                                                        group.attendancePercentage >= 90 ? "bg-green-50 text-green-600 border-green-100" :
                                                            group.attendancePercentage >= 75 ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                "bg-red-50 text-red-600 border-red-100"
                                                    )}>
                                                        {group.attendancePercentage}% حضور
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddGroupModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
            <ManageGroupsModal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
            />
            <EditGroupModal
                isOpen={!!selectedGroupToEdit}
                onClose={() => setSelectedGroupToEdit(null)}
                group={selectedGroupToEdit}
            />
        </div>
    );
}
