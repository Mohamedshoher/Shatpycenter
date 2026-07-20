export interface DashboardData {
    groups: any[];
    students: any[];
    todayAttendanceCount: number;
    monthlyIncome: number;
    pendingLeaves: any[];
    unreadNotesCount: number;
    recentNotes: any[];
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
