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

        const matchesSearch = (group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (group.teacher || '').toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'الكل' || group.name.includes(filter);
        return matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    return (
        <div className="min-h-screen bg-[#f8faff] pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 text-right">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto order-2 sm:order-1">
                        <AnimatePresence mode="wait">
                            {isSearchOpen ? (
                                <motion.div
                                    key="search"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative"
                                >
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="بحث باسم المجموعة..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-80 h-12 bg-white border border-purple-100 rounded-2xl px-10 text-right font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all shadow-sm"
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                                    <button
                                        onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={18} />
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="header-actions"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-3"
                                >
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-100 transition-all shadow-sm"
                                    >
                                        <Search size={22} />
                                    </button>

                                    {user?.role !== 'teacher' && (
                                        <>
                                            {/* Filter Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                                    className={cn(
                                                        "h-12 px-7 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 text-gray-600 font-bold transition-all shadow-sm min-w-[150px]",
                                                        isFilterDropdownOpen ? "border-purple-500 ring-2 ring-purple-500/10" : "hover:border-purple-200"
                                                    )}
                                                >
                                                    <Filter size={18} className="text-purple-500 shrink-0" />
                                                    <span className="text-sm flex-1 text-center">{filter}</span>
                                                    <ChevronDown size={16} className={cn("transition-transform duration-300 shrink-0", isFilterDropdownOpen && "rotate-180")} />
                                                </button>

                                                <AnimatePresence>
                                                    {isFilterDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute top-14 left-0 sm:right-0 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1"
                                                        >
                                                            {['الكل', 'قرآن', 'تلقين', 'نور بيان', 'إقراء'].map((type) => (
                                                                <button
                                                                    key={type}
                                                                    onClick={() => {
                                                                        setFilter(type);
                                                                        setIsFilterDropdownOpen(false);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full px-5 py-3 text-right text-sm font-bold transition-all flex items-center justify-between",
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

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setIsManageModalOpen(true)}
                                                    className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition-all border border-blue-100/50"
                                                    title="تعديل المجموعات"
                                                >
                                                    <Settings2 size={22} />
                                                </button>
                                                <button
                                                    onClick={() => setIsAddModalOpen(true)}
                                                    className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                                                    title="إضافة مجموعة"
                                                >
                                                    <Plus size={22} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-[#1e293b] order-1 sm:order-2">
                        المجموعات <span className="text-purple-600 text-lg md:text-xl">({filteredGroups?.length || 0})</span>
                    </h1>
                </div>

                {/* Main Dynamic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-32 bg-white rounded-[32px] animate-pulse shadow-sm" />
                        ))
                    ) : (
                        filteredGroups?.map((group) => (
                            <motion.div
                                layout
                                key={group.id}
                                className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 flex flex-col justify-between gap-4 hover:shadow-xl hover:shadow-purple-500/5 transition-all group"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                                        <h3 className="font-black text-[#1e293b] text-xl group-hover:text-purple-600 transition-colors truncate">
                                            {group.name}
                                        </h3>
                                    </Link>
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0", group.color)}>
                                        {group.count} طلاب
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <button className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0">
                                        <BarChart3 size={20} />
                                    </button>

                                    <div className="flex flex-col text-right min-w-0">
                                        <span className="text-[10px] text-gray-400 font-bold">المدرس المسؤول</span>
                                        <span className="text-sm font-bold text-gray-700 truncate">{group.teacher}</span>
                                    </div>
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
