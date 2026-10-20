import { getErrorMessage } from '@/lib/error-message';

export type TeacherNoteVisibility = 'general' | 'private';

export interface TeacherNote {
    id: string;
    teacherId: string;
    content: string;
    visibility: TeacherNoteVisibility;
    createdBy?: string;
    createdAt: string;
}

interface TeacherNoteRow {
    id: string;
    teacher_id: string;
    content: string;
    visibility: string;
    created_by: string | null;
    created_at: string;
}

const mapRow = (row: TeacherNoteRow): TeacherNote => ({
    id: row.id,
    teacherId: row.teacher_id,
    content: row.content,
    visibility: row.visibility === 'private' ? 'private' : 'general',
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
});

export const getTeacherNotes = async (teacherId: string): Promise<TeacherNote[]> => {
    try {
        const res = await fetch(`/api/teachers/notes?teacherId=${encodeURIComponent(teacherId)}`);
        if (!res.ok) return [];
        const data: TeacherNoteRow[] = await res.json();
        return (data || []).map(mapRow);
    } catch (error) {
        console.error('Error fetching teacher notes:', getErrorMessage(error));
        return [];
    }
};

export const addTeacherNote = async (teacherId: string, content: string, visibility: TeacherNoteVisibility): Promise<void> => {
    const res = await fetch('/api/teachers/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, content, visibility }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر إضافة الملحوظة');
    }
};

export const deleteTeacherNote = async (id: string): Promise<void> => {
    const res = await fetch(`/api/teachers/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر حذف الملحوظة');
    }
};
