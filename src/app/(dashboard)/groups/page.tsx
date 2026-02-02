"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroups } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
    Users,
    Search,
    Plus,
    Menu,
    X,
    Settings2,
    BarChart3,
    ChevronDown,
    Filter
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AddGroupModal from '@/features/groups/components/AddGroupModal';
import ManageGroupsModal from '@/features/groups/components/ManageGroupsModal';

export default function GroupsPage() {
    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: getTeachers
    });

    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: getStudents
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filter, setFilter] = useState('الكل');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();

    // تحسين بيانات المجموعات بإضافة اسم المعلم وعدد الطلاب ولون
    const enhancedGroups = useMemo(() => {
        if (!groups) return [];

        return groups.map(group => {
            const teacher = teachers?.find(t => t.id === group.teacherId);
            const studentCount = students?.filter(s => s.groupId === group.id && s.status === 'active').length || 0;

            // تحديد اللون بناءً على اسم المجموعة
            let color = 'bg-gray-100 text-gray-600';
            if (group.name.includes('قرآن')) color = 'bg-blue-100 text-blue-600';
            else if (group.name.includes('تلقين')) color = 'bg-green-100 text-green-600';
            else if (group.name.includes('نور بيان')) color = 'bg-orange-100 text-orange-600';
            else if (group.name.includes('إقراء')) color = 'bg-red-100 text-red-600';

            return {
                ...group,
                teacher: teacher?.fullName || 'غير محدد',
                count: studentCount,
                color
            };
        });
    }, [groups, teachers, students]);

    const filteredGroups = enhancedGroups?.filter(group => {
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

        const matchesSearch = (group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (group.teacher || '').toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'الكل' || group.name.includes(filter);
        return matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

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
                                    title="إضافة مجموعة"
                                >
                                    <Plus size={22} />
                                </button>
                                <button
                                    onClick={() => setIsManageModalOpen(true)}
                                    className="w-11 h-11 bg-white border border-gray-100 text-blue-600 rounded-[16px] flex items-center justify-center hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                    title="إدارة المجموعات"
                                >
                                    <Settings2 size={22} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Groups Count - Center */}
                    {!isSearchOpen && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/50 px-4 h-11 rounded-[16px] border border-purple-100/50 shadow-sm pointer-events-none transition-all duration-300">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest hidden sm:inline">المجموعات</span>
                            <span className="text-xl font-black text-purple-600 font-sans">{filteredGroups?.length || 0}</span>
                        </div>
                    )}

                    {/* Search and Filters - Right */}
                    <div className="flex items-center gap-2 flex-1 justify-end max-w-2xl">
                        <AnimatePresence mode="wait">
                            {isSearchOpen ? (
                                <motion.div
                                    key="search"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="relative flex-1"
                                >
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="بحث باسم المجموعة..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-11 bg-white border border-purple-100 rounded-[16px] px-10 text-right font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all shadow-sm"
                                    />
                                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                                    <button
                                        onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={18} />
                                    </button>
                                </motion.div>
                            ) : (
                                <div key="controls" className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="w-11 h-11 bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-gray-400 hover:text-purple-600 transition-all shadow-sm active:scale-95"
                                    >
                                        <Search size={22} />
                                    </button>

                                    {user?.role !== 'teacher' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                                className={cn(
                                                    "h-11 px-4 bg-white border border-gray-100 rounded-[16px] flex items-center gap-2 text-gray-600 font-bold transition-all shadow-sm active:scale-95",
                                                    isFilterDropdownOpen ? "border-purple-500" : "hover:border-purple-200"
                                                )}
                                            >
                                                <Filter size={18} className="text-purple-500" />
                                                <span className="text-xs hidden sm:inline">{filter}</span>
                                                <ChevronDown size={14} className={cn("transition-transform duration-300", isFilterDropdownOpen && "rotate-180")} />
                                            </button>

                                            <AnimatePresence>
                                                {isFilterDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute top-[120%] left-0 w-40 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1"
                                                    >
                                                        {['الكل', 'قرآن', 'تلقين', 'نور بيان', 'إقراء'].map((type) => (
                                                            <button
                                                                key={type}
                                                                onClick={() => {
                                                                    setFilter(type);
                                                                    setIsFilterDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-2.5 text-right text-xs font-bold transition-all flex items-center justify-between",
                                                                    filter === type ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                {type}
                                                                {filter === type && <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
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
                            <motion.div
                                layout
                                key={group.id}
                                className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-4 hover:shadow-xl hover:shadow-purple-500/5 transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start">
                                    <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                                        <h3 className="font-black text-[#1e293b] text-2xl group-hover:text-purple-600 transition-colors truncate">
                                            {group.name}
                                        </h3>
                                    </Link>
                                    <span className={cn("px-3 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-wider shrink-0", group.color)}>
                                        {group.count} طلاب
                                    </span>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div className="flex flex-col text-right min-w-0">
                                        <span className="text-base font-bold text-gray-500 truncate leading-tight">{group.teacher}</span>
                                    </div>

                                    <button className="w-11 h-11 bg-indigo-50/50 text-indigo-600 rounded-[14px] flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0">
                                        <BarChart3 size={20} />
                                    </button>
                                </div>
                            </motion.div>
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
        </div>
    );
}
