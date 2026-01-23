"use client";

import { useQuery } from '@tanstack/react-query';
import { getGroups } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import StudentList from '@/features/students/components/StudentList';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GroupDetailPage() {
    const params = useParams();
    const groupId = params.groupId as string;

    const { data: groups } = useQuery({
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

    const group = useMemo(() => {
        const foundGroup = groups?.find(g => g.id === groupId);
        if (!foundGroup) return null;

        const teacher = teachers?.find(t => t.id === foundGroup.teacherId);
        const studentCount = students?.filter(s => s.groupId === foundGroup.id && s.status === 'active').length || 0;

        let color = 'bg-gray-100 text-gray-600';
        if (foundGroup.name.includes('قرآن')) color = 'bg-blue-100 text-blue-600';
        else if (foundGroup.name.includes('تلقين')) color = 'bg-green-100 text-green-600';
        else if (foundGroup.name.includes('نور بيان')) color = 'bg-orange-100 text-orange-600';
        else if (foundGroup.name.includes('إقراء')) color = 'bg-red-100 text-red-600';

        return {
            ...foundGroup,
            teacher: teacher?.fullName || 'غير محدد',
            count: studentCount,
            color
        };
    }, [groups, teachers, students, groupId]);

    return (
        <div className="flex flex-col h-full">
            {/* Custom Group Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    {/* Back Button (Optional but good UX) */}
                    <Link href="/groups" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
                        <ArrowRight size={24} />
                    </Link>

                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                {group?.name || 'جاري التحميل...'}
                                {group && (
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full", group.color)}>
                                        {group.count} طالب
                                    </span>
                                )}
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1">
                            <span className="text-gray-400">المدرس:</span>
                            {group?.teacher || '...'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <StudentList groupId={groupId} customTitle="الطلاب" />
            </div>
        </div>
    );
}


