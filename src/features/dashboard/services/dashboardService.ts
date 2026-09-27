import type { Group, Student } from '@/types';
import type { LeaveRequest } from '@/features/students/services/recordsService';
import type { StudentNote } from '@/features/finance/components/StudentNotesModal';

export interface DashboardData {
    groups: Group[];
    students: Student[];
    todayAttendanceCount: number;
    monthlyIncome: number;
    pendingLeaves: LeaveRequest[];
    unreadNotesCount: number;
    recentNotes: StudentNote[];
}

export async function getDashboardData(params: {
    role?: string;
    teacherId?: string;
    groupIds?: string[];
    sections?: string[];
}): Promise<DashboardData> {
    try {
        const searchParams = new URLSearchParams();
        if (params.role) searchParams.set('role', params.role);
        if (params.teacherId) searchParams.set('teacherId', params.teacherId);
        if (params.groupIds?.length) searchParams.set('groupIds', params.groupIds.join(','));
        if (params.sections?.length) searchParams.set('sections', params.sections.join(','));

        const res = await fetch(`/api/dashboard?${searchParams.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        return await res.json();
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
            groups: [],
            students: [],
            todayAttendanceCount: 0,
            monthlyIncome: 0,
            pendingLeaves: [],
            unreadNotesCount: 0,
            recentNotes: [],
        };
    }
}
