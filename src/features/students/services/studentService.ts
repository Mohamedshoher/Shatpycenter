import { Student } from "@/types";
import { supabase } from "@/lib/supabase";

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

import { formatNotesWithAzhari, AZHAR_CURRICULUM } from "../constants/azharCurriculum";

export const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    try {
        const finalNotes = formatNotesWithAzhari(student.notes, !!student.isAzhari, student.azhariGrade);
        const insertObj: any = {
            full_name: student.fullName,
            group_id: student.groupId || null,
            parent_phone: student.parentPhone,
            status: student.status || 'pending',
            monthly_amount: student.monthlyAmount,
            notes: finalNotes || null,
            enrollment_date: student.enrollmentDate,
            appointment: student.appointment || null
        };

        if (student.isAzhari !== undefined) insertObj.is_azhari = !!student.isAzhari;
        if (student.azhariGrade !== undefined) insertObj.azhari_grade = student.azhariGrade || null;
        if (student.isOrphan !== undefined) insertObj.is_orphan = !!student.isOrphan;

        const { data, error } = await supabase
            .from('students')
            .insert([insertObj])
            .select('id')
            .single();

        if (error) throw error;

        // إضافة ملحوظة بمقرر الأزهر تلقائياً في سجل الملحوظات
        if (student.isAzhari && data?.id) {
            try {
                const curr = AZHAR_CURRICULUM.find(c => c.grade === student.azhariGrade) || AZHAR_CURRICULUM[0];
                const content = `🕌 مقرر الأزهر الشريف (${curr.grade} - ${curr.stage}):\n📖 الفصل الدراسي الأول: ${curr.term1}\n📖 الفصل الدراسي الثاني: ${curr.term2}\n🎯 المقرر الإجمالي: ${curr.juz}`;
                await supabase.from('student_notes').insert([{
                    student_id: data.id,
                    content,
                    type: 'positive',
                    created_by: 'النظام (مقرر الأزهر الشريف)'
                }]);
            } catch (noteErr) {
                console.warn("Could not insert azhari note into student_notes table:", noteErr);
            }
        }

        return data.id;
    } catch (error) {
        console.error("Error adding student:", error);
        throw error;
    }
};

export const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    try {
        const updates: any = {};
        if (data.fullName) updates.full_name = data.fullName;
        if (data.groupId !== undefined) updates.group_id = data.groupId;
        if (data.parentPhone) updates.parent_phone = data.parentPhone;
        if (data.status) updates.status = data.status;
        if (data.monthlyAmount !== undefined) updates.monthly_amount = data.monthlyAmount;
        if (data.address) updates.address = data.address;
        if (data.notes !== undefined || data.isAzhari !== undefined || data.azhariGrade !== undefined) {
            updates.notes = formatNotesWithAzhari(data.notes, !!data.isAzhari, data.azhariGrade) || null;
        }
        if (data.isAzhari !== undefined) updates.is_azhari = !!data.isAzhari;
        if (data.azhariGrade !== undefined) updates.azhari_grade = data.azhariGrade || null;
        if (data.isOrphan !== undefined) updates.is_orphan = !!data.isOrphan;
        if (data.appointment !== undefined) updates.appointment = data.appointment;
        if (data.enrollmentDate) updates.enrollment_date = data.enrollmentDate;
        if (data.archivedDate) updates.archived_date = data.archivedDate;

        const { error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error("Supabase detailed error:", error);
            throw error;
        }
    } catch (error: any) {
        console.error("Error updating student:", error);
        const errorMsg = error.message || error.details || JSON.stringify(error);
        console.error("Technical Message:", errorMsg);
        throw new Error(errorMsg);
    }
};

export const deleteStudent = async (id: string): Promise<void> => {
    try {
        console.log(`🗑️ البدء في حذف الطالب: ${id}`);

        // 1. حذف السجلات المرتبطة يدوياً لضمان عدم وجود قيود (Cascading)
        const tablesToClear = [
            { name: 'attendance', col: 'student_id' },
            { name: 'exams', col: 'student_id' },
            { name: 'fees', col: 'student_id' },
            { name: 'plans', col: 'student_id' },
            { name: 'student_notes', col: 'student_id' },
            { name: 'leave_requests', col: 'student_id' },
            { name: 'user_presence', col: 'user_id' },
        ];

        for (const table of tablesToClear) {
            const { error: clearError } = await supabase
                .from(table.name)
                .delete()
                .eq(table.col, id);

            if (clearError) {
                console.warn(`⚠️ لم يتمكن من تنظيف الجدول ${table.name}:`, clearError.message);
            }
        }

        // 2. تنظيف المعاملات المالية المرتبطة
        await supabase.from('financial_transactions').delete().eq('related_user_id', id);

        // 3. حذف الطالب نهائياً
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("❌ فشل حذف الطالب من جدول students:", error);
            throw error;
        }

        console.log(`✅ تم حذف الطالب ${id} وكل سجلاته بنجاح.`);
    } catch (error: any) {
        console.error("Error deleting student:", error);
        // استخراج تفاصيل الخطأ بدقة
        const techDetails = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error("Full Technical Error:", techDetails);
        throw new Error(`تعذر حذف الطالب: ${techDetails}`);
    }
};

export const clearGroupAppointments = async (groupId: string, dayOnly?: string): Promise<void> => {
    try {
        if (!dayOnly) {
            // مسح كافة المواعيد لجميع طلاب المجموعة
            const { error } = await supabase
                .from('students')
                .update({ appointment: null })
                .eq('group_id', groupId);
            if (error) throw error;
        } else {
            // مسح موعد يوم محدد فقط لطلاب المجموعة
            const { data: students, error: fetchErr } = await supabase
                .from('students')
                .select('id, appointment')
                .eq('group_id', groupId);
            if (fetchErr) throw fetchErr;

            const updates = (students || [])
                .filter(s => s.appointment && s.appointment.includes(dayOnly))
                .map(s => {
                    const newApp = (s.appointment || '')
                        .split(',')
                        .map((p: string) => p.trim())
                        .filter((p: string) => !p.startsWith(`${dayOnly}:`))
                        .join(', ')
                        .trim();
                    return supabase
                        .from('students')
                        .update({ appointment: newApp || null })
                        .eq('id', s.id);
                });

            if (updates.length > 0) {
                await Promise.all(updates);
            }
        }
    } catch (error) {
        console.error("Error clearing group appointments:", error);
        throw error;
    }
};

