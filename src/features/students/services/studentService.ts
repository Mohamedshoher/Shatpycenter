import { Student } from "@/types";
import { formatNotesWithAzhari, AZHAR_CURRICULUM } from "../constants/azharCurriculum";

// ==========================================================
// خدمة إدارة الطلاب — كل العمليات عبر /api/students على الخادم
// ==========================================================

export const getStudents = async (groupIds?: string[], status?: string): Promise<Student[]> => {
    try {
        const params = new URLSearchParams();
        if (status) {
            params.set('status', status);
        }
        if (groupIds && groupIds.length > 0) {
            params.set('groupIds', groupIds.join(','));
        }
        const qs = params.toString();
        const res = await fetch(`/api/students${qs ? '?' + qs : ''}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("API error fetching students:", errorText);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Unexpected error fetching students:", error);
        return [];
    }
};

export const getStudentById = async (id: string): Promise<Student | null> => {
    try {
        const res = await fetch(`/api/students?studentId=${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error("Error fetching student by id:", error);
        return null;
    }
};

export const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    const finalNotes = formatNotesWithAzhari(student.notes, !!student.isAzhari, student.azhariGrade);

    // نجهّز نص ملحوظة مقرر الأزهر هنا (تنسيق نص بحت، بدون أي وصول لقاعدة البيانات)
    let azhariNoteContent: string | undefined;
    if (student.isAzhari) {
        const curr = AZHAR_CURRICULUM.find(c => c.grade === student.azhariGrade) || AZHAR_CURRICULUM[0];
        azhariNoteContent = `🕌 مقرر الأزهر الشريف (${curr.grade} - ${curr.stage}):\n📖 الفصل الدراسي الأول: ${curr.term1}\n📖 الفصل الدراسي الثاني: ${curr.term2}\n🎯 المقرر الإجمالي: ${curr.juz}`;
    }

    const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...student, notes: finalNotes || null, azhariNoteContent }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر إضافة الطالب');
    return body.id;
};

export const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    const payload: any = { id, ...data };
    if (data.notes !== undefined || data.isAzhari !== undefined || data.azhariGrade !== undefined) {
        payload.notes = formatNotesWithAzhari(data.notes, !!data.isAzhari, data.azhariGrade) || null;
    }

    const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر تحديث بيانات الطالب');
};

export const deleteStudent = async (id: string): Promise<void> => {
    const res = await fetch(`/api/students?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `تعذر حذف الطالب`);
};

export const clearGroupAppointments = async (groupId: string, dayOnly?: string): Promise<void> => {
    const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, dayOnly }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر مسح المواعيد');
};
