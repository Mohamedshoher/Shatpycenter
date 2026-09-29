import { getErrorMessage } from '@/lib/error-message';

export interface PeriodStats {
    examsCount: number;
    pagesSum: number;
    linesSum: number;
    notTestedCount: number;
    attendanceRate: number | null;
    collected: number;
    expected: number;
    collectionRate: number | null;
}

export interface AnalyticsOverview {
    monthKey: string;
    prevMonthKey: string;
    totalStudents: number;
    current: PeriodStats;
    previous: PeriodStats;
}

export interface GroupAnalyticsPeriod {
    examsCount: number;
    pagesSum: number;
    attendanceRate: number | null;
}

export interface GroupAnalytics {
    id: string;
    name: string;
    teacherName: string;
    studentsCount: number;
    current: GroupAnalyticsPeriod;
    previous: GroupAnalyticsPeriod;
}

export interface StudentMonthAnalytics {
    monthKey: string;
    label: string;
    examsCount: number;
    pagesSum: number;
    linesSum: number;
    attendanceRate: number | null;
}

export const getAnalyticsOverview = async (monthKey: string): Promise<AnalyticsOverview | null> => {
    try {
        const res = await fetch(`/api/analytics/overview?month=${encodeURIComponent(monthKey)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error('Error fetching analytics overview:', getErrorMessage(error));
        return null;
    }
};

export const getGroupsAnalytics = async (monthKey: string): Promise<GroupAnalytics[]> => {
    try {
        const res = await fetch(`/api/analytics/groups?month=${encodeURIComponent(monthKey)}`);
        if (!res.ok) return [];
        return (await res.json()) || [];
    } catch (error) {
        console.error('Error fetching groups analytics:', getErrorMessage(error));
        return [];
    }
};

export const getStudentAnalytics = async (studentId: string, months = 6): Promise<StudentMonthAnalytics[]> => {
    try {
        const res = await fetch(`/api/analytics/student?studentId=${encodeURIComponent(studentId)}&months=${months}`);
        if (!res.ok) return [];
        return (await res.json()) || [];
    } catch (error) {
        console.error('Error fetching student analytics:', getErrorMessage(error));
        return [];
    }
};
