import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// بنود اتفاق العمل بين الإدارة والمعلمين.
// الأساس: جدول agreement_terms (نسخة عامة افتراضية لكل بند).
// التخصيص: جدول agreement_term_variants يسمح بإصدار خاص بقسم معين
// (قرآن/تلقين/نور بيان/تجويد) أو بمعلم واحد بعينه، بأولوية:
// معلم محدد > قسم > النسخة العامة.
const SECTION_KEYWORDS = ['قرآن', 'تلقين', 'نور بيان', 'تجويد'];

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');

        const supabase = createServerSupabase();
        const { data: baseTerms, error } = await supabase
            .from('agreement_terms')
            .select('id, order_index, icon, title, content, updated_at, updated_by')
            .order('order_index', { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // تحديد أقسام هذا المعلم (من أسماء مجموعاته) لتطبيق أي تخصيص قسمي عليه
        let teacherSections: string[] = [];
        if (teacherId) {
            const { data: groups } = await supabase
                .from('groups')
                .select('name')
                .eq('teacher_id', teacherId);
            teacherSections = SECTION_KEYWORDS.filter((kw) =>
                (groups || []).some((g) => (g.name || '').includes(kw))
            );
        }

        const { data: variants } = await supabase
            .from('agreement_term_variants')
            .select('order_index, scope_type, scope_value, title, content, updated_at, updated_by');

        const terms = (baseTerms || []).map((row) => {
            let resolved = {
                id: row.id,
                orderIndex: row.order_index,
                icon: row.icon || '',
                title: row.title,
                content: row.content,
                updatedAt: row.updated_at,
                updatedBy: row.updated_by || '',
                scope: 'all' as 'all' | 'section' | 'teacher',
                scopeValue: null as string | null,
            };

            if (teacherId) {
                const teacherVariant = (variants || []).find(
                    (v) => v.order_index === row.order_index && v.scope_type === 'teacher' && v.scope_value === teacherId
                );
                const sectionVariant = !teacherVariant && teacherSections.length > 0
                    ? (variants || []).find(
                        (v) => v.order_index === row.order_index && v.scope_type === 'section' && teacherSections.includes(v.scope_value)
                    )
                    : undefined;
                const winner = teacherVariant || sectionVariant;
                if (winner) {
                    resolved = {
                        ...resolved,
                        title: winner.title,
                        content: winner.content,
                        updatedAt: winner.updated_at,
                        updatedBy: winner.updated_by || '',
                        scope: winner.scope_type as 'section' | 'teacher',
                        scopeValue: winner.scope_value,
                    };
                }
            }

            return resolved;
        });

        return NextResponse.json(terms);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { id, title, content, scope, scopeValue, teacherId } = await request.json();
        if (!id || !title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: 'بيانات البند غير مكتملة' }, { status: 400 });
        }
        if (!['all', 'section', 'teacher'].includes(scope)) {
            return NextResponse.json({ error: 'نطاق التعديل غير صحيح' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const updatedBy = session.displayName || null;
        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();

        const { data: termRow, error: termError } = await supabase
            .from('agreement_terms')
            .select('order_index')
            .eq('id', id)
            .single();
        if (termError || !termRow) return NextResponse.json({ error: 'البند غير موجود' }, { status: 404 });
        const orderIndex = termRow.order_index;

        let notificationTeacherIds: (string | null)[] = [];

        if (scope === 'all') {
            const { error } = await supabase
                .from('agreement_terms')
                .update({ title: trimmedTitle, content: trimmedContent, updated_at: new Date().toISOString(), updated_by: updatedBy })
                .eq('id', id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            notificationTeacherIds = [null]; // بث عام لكل المعلمين
        } else if (scope === 'section') {
            if (!scopeValue) return NextResponse.json({ error: 'اختر القسم المستهدف' }, { status: 400 });
            const { error } = await supabase
                .from('agreement_term_variants')
                .upsert({
                    order_index: orderIndex,
                    scope_type: 'section',
                    scope_value: scopeValue,
                    title: trimmedTitle,
                    content: trimmedContent,
                    updated_at: new Date().toISOString(),
                    updated_by: updatedBy,
                }, { onConflict: 'order_index,scope_type,scope_value' });
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            const { data: groups } = await supabase.from('groups').select('teacher_id').ilike('name', `%${scopeValue}%`);
            notificationTeacherIds = [...new Set((groups || []).map((g) => g.teacher_id).filter(Boolean))];
        } else {
            if (!teacherId) return NextResponse.json({ error: 'حدد المعلم المستهدف' }, { status: 400 });
            const { error } = await supabase
                .from('agreement_term_variants')
                .upsert({
                    order_index: orderIndex,
                    scope_type: 'teacher',
                    scope_value: teacherId,
                    title: trimmedTitle,
                    content: trimmedContent,
                    updated_at: new Date().toISOString(),
                    updated_by: updatedBy,
                }, { onConflict: 'order_index,scope_type,scope_value' });
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            notificationTeacherIds = [teacherId];
        }

        const notifRows = notificationTeacherIds.map((tId) => ({
            teacher_id: tId,
            type: 'system',
            title: 'تحديث في بنود الاتفاق',
            message: `تم تعديل بند "${trimmedTitle}" في تقرير بنود الاتفاق، رجاء راجع التقرير.`,
        }));
        if (notifRows.length > 0) await supabase.from('notifications').insert(notifRows);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
