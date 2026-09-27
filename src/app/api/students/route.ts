import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { Student } from '@/types';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const groupIds = searchParams.get('groupIds');
        const status = searchParams.get('status');
        const studentId = searchParams.get('studentId');

        const supabase = createServerSupabase();
        let query = supabase
            .from('students')
            .select('id, full_name, group_id, parent_phone, status, monthly_amount, appointment, notes, is_azhari, azhari_grade, is_orphan, enrollment_date, archived_date, created_at');

        if (studentId) {
            query = query.eq('id', studentId);
        } else if (groupIds) {
            const ids = groupIds.split(',');
            query = query.in('group_id', ids);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const students: Student[] = (data || []).map((row) => {
            const notesStr = row.notes || '';
            const isAzhari = Boolean(row.is_azhari);
            const azhariGrade = row.azhari_grade || '';
            const isOrphan = Boolean(
                row.is_orphan === true ||
                (row.is_orphan as unknown) === 'true' ||
                (row.is_orphan as unknown) === 1
            );

            return {
                id: row.id,
                fullName: row.full_name,
                groupId: row.group_id,
                parentPhone: row.parent_phone || '',
                status: row.status,
                isArchived: row.status === 'archived',
                monthlyAmount: Number(row.monthly_amount) || 0,
                address: '',
                appointment: row.appointment || '',
                notes: notesStr,
                isAzhari,
                azhariGrade,
                isOrphan,
                enrollmentDate: row.enrollment_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                archivedDate: row.archived_date || undefined,
                whatsapp: row.parent_phone || '',
                email: '',
                password: '',
                role: 'student',
                attendance: [],
                exams: []
            };
        }) as unknown as Student[];

        return NextResponse.json(students);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const student = await request.json();
        const supabase = createServerSupabase();

        const insertObj: Record<string, unknown> = {
            full_name: student.fullName,
            group_id: student.groupId || null,
            parent_phone: student.parentPhone,
            status: student.status || 'pending',
            monthly_amount: student.monthlyAmount,
            notes: student.notes || null,
            enrollment_date: student.enrollmentDate,
            appointment: student.appointment || null
        };
        if (student.isAzhari !== undefined) insertObj.is_azhari = !!student.isAzhari;
        if (student.azhariGrade !== undefined) insertObj.azhari_grade = student.azhariGrade || null;
        if (student.isOrphan !== undefined) insertObj.is_orphan = !!student.isOrphan;

        const { data, error } = await supabase.from('students').insert([insertObj as never]).select('id').single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        if (student.isAzhari && student.azhariNoteContent && data?.id) {
            try {
                await supabase.from('student_notes').insert([{
                    student_id: data.id,
                    content: student.azhariNoteContent,
                    type: 'positive',
                    created_by: 'النظام (مقرر الأزهر الشريف)'
                }]);
            } catch (noteErr) {
                console.warn('Could not insert azhari note:', noteErr);
            }
        }

        return NextResponse.json({ id: data.id });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { id, ...data } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const updates: Record<string, unknown> = {};
        if (data.fullName) updates.full_name = data.fullName;
        if (data.groupId !== undefined) updates.group_id = data.groupId;
        if (data.parentPhone) updates.parent_phone = data.parentPhone;
        if (data.status) updates.status = data.status;
        if (data.monthlyAmount !== undefined) updates.monthly_amount = data.monthlyAmount;
        if (data.address) updates.address = data.address;
        if (data.notes !== undefined) updates.notes = data.notes;
        if (data.isAzhari !== undefined) updates.is_azhari = !!data.isAzhari;
        if (data.azhariGrade !== undefined) updates.azhari_grade = data.azhariGrade || null;
        if (data.isOrphan !== undefined) updates.is_orphan = !!data.isOrphan;
        if (data.appointment !== undefined) updates.appointment = data.appointment;
        if (data.enrollmentDate) updates.enrollment_date = data.enrollmentDate;
        if (data.archivedDate) updates.archived_date = data.archivedDate;

        const supabase = createServerSupabase();
        const { error } = await supabase.from('students').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const tablesToClear = [
            { name: 'attendance', col: 'student_id' },
            { name: 'exams', col: 'student_id' },
            { name: 'fees', col: 'student_id' },
            { name: 'plans', col: 'student_id' },
            { name: 'student_notes', col: 'student_id' },
            { name: 'leave_requests', col: 'student_id' },
            { name: 'user_presence', col: 'user_id' },
        ] as const;
        for (const table of tablesToClear) {
            const { error: clearError } = await supabase.from(table.name).delete().eq(table.col, id);
            if (clearError) console.warn(`تعذر تنظيف الجدول ${table.name}:`, clearError.message);
        }
        await supabase.from('financial_transactions').delete().eq('related_user_id', id);

        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

// مسح مواعيد طلاب مجموعة كاملة (يوم واحد أو كل المواعيد)
export async function PATCH(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { groupId, dayOnly } = await request.json();
        if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

        const supabase = createServerSupabase();
        if (!dayOnly) {
            const { error } = await supabase.from('students').update({ appointment: null }).eq('group_id', groupId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        const { data: students, error: fetchErr } = await supabase
            .from('students')
            .select('id, appointment')
            .eq('group_id', groupId);
        if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

        const updates = (students || [])
            .filter((s) => s.appointment && s.appointment.includes(dayOnly))
            .map((s) => {
                const newApp = (s.appointment || '')
                    .split(',')
                    .map((p: string) => p.trim())
                    .filter((p: string) => !p.startsWith(`${dayOnly}:`))
                    .join(', ')
                    .trim();
                return supabase.from('students').update({ appointment: newApp || null }).eq('id', s.id);
            });

        if (updates.length > 0) await Promise.all(updates);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
