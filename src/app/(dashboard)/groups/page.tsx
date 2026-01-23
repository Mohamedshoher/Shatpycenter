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
    BarChart3
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
        <div className="space-y-6 pb-24 bg-[#f8faff] min-h-screen p-4 md:p-6 text-right">
            {/* Header */}
            <div className="flex items-center justify-between pt-2 pb-2 gap-4 relative h-12">
                <AnimatePresence mode="wait">
                    {isSearchOpen ? (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute inset-0 z-20 flex items-center"
                        >
                            <div className="relative flex-1">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="ابحث باسم المجموعة أو المدرس..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-12 bg-white border border-purple-100 rounded-2xl px-10 text-right font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all shadow-sm"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                                <button
                                    onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="header"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between w-full"
                        >
                            {/* Right side: Search button */}
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-all active:scale-95"
                            >
                                <Search size={20} />
                            </button>

                            {/* Center: Title */}
                            <h1 className="text-xl font-bold text-[#1e293b] absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                المجموعات({filteredGroups?.length || 0})
                            </h1>

                            {/* Left side: Functional Icons */}
                            <div className="flex items-center gap-2">
                                {user?.role !== 'teacher' && (
                                    <>
                                        <button
                                            onClick={() => setIsManageModalOpen(true)}
                                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border border-blue-100/50"
                                            title="تعديل المجموعات"
                                        >
                                            <Settings2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-purple-500/20"
                                            title="إضافة مجموعة"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-row-reverse gap-2 overflow-x-auto no-scrollbar pb-2">
                {['الكل', 'قرآن', 'تلقين', 'نور بيان', 'إقراء'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={cn(
                            "flex-shrink-0 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border",
                            filter === type
                                ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20"
                                : "bg-white text-gray-500 border-gray-100 hover:border-purple-200"
                        )}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />)
                ) : (
                    filteredGroups?.map((group) => (
                        <div key={group.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex items-center justify-between group hover:shadow-md transition-all">
                            {/* Group Info on the left */}
                            <Link href={`/groups/${group.id}`} className="text-right flex flex-col gap-1 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#1e293b] text-lg hover:text-purple-600 transition-colors">{group.name}</h3>
                                    <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold min-w-[28px]", group.color)}>
                                        {group.count}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 font-bold">المدرس: {group.teacher}</p>
                            </Link>

                            {/* Report Button on the right */}
                            <button className="flex items-center gap-2 bg-[#eef2ff] text-[#4f46e5] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#e0e7ff] transition-colors">
                                <span className="order-2">تقرير</span>
                                <BarChart3 size={18} className="order-1" />
                            </button>
                        </div>
                    ))
                )}
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
