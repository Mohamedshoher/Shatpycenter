import { getErrorMessage } from '@/lib/error-message';

// توزيع طلاب المجموعة على أيام الأسبوع (0=السبت ... 4=الأربعاء) لدورة الاختبارات
export interface ExamCycleAssignment {
    studentId: string;
    weekday: number; // 0..4
}

export const getExamCycleAssignments = async (studentIds: string[]): Promise<ExamCycleAssignment[]> => {
    try {
        if (studentIds.length === 0) return [];
        const res = await fetch(`/api/exam-cycle?studentIds=${encodeURIComponent(studentIds.join(','))}`);
        if (!res.ok) return [];
        return (await res.json()) || [];
    } catch (error) {
        console.error('Error fetching exam cycle assignments:', getErrorMessage(error));
        return [];
    }
};

export const setExamCycleAssignment = async (studentId: string, weekday: number): Promise<void> => {
    const res = await fetch('/api/exam-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, weekday }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر حفظ توزيع الطالب');
    }
};

export const setExamCycleAssignmentsBatch = async (items: ExamCycleAssignment[]): Promise<void> => {
    if (items.length === 0) return;
    const res = await fetch('/api/exam-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر حفظ التوزيع');
    }
};
