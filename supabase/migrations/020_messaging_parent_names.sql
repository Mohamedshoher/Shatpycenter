-- إصلاح أسماء أولياء الأمور في نظام الرسائل:
-- كانت محادثات جديدة مع ولي أمر تُنشأ باسم = رقم الهاتف نفسه (msg_create_conversation
-- لم يكن يبحث عن اسم الطالب إطلاقاً لطرف ولي الأمر)، وكانت قوائم جهات الاتصال
-- (msg_get_contacts) تعرض بعض أولياء الأمور باسم الطالب مجرداً بلا كلمة "ولي أمر".
-- هذا الملف: (1) يصلح الدالتين لإنشاء اسم "ولي أمر <اسم الطالب>" دائماً باختيار
-- طالب واحد محدد (الأحدث تسجيلاً من بين النشطين إن وُجد)، و(2) يُصحّح أسماء
-- المحادثات الموجودة فعلاً حتى تظهر الإصلاحة فوراً بدل الانتظار لمحادثات جديدة.

CREATE OR REPLACE FUNCTION msg_get_contacts(p_token UUID)
RETURNS JSON AS $$
DECLARE
    v_actor TEXT;
    v_kind TEXT;
    v_id TEXT;
    v_teachers JSON := '[]'::JSON;
    v_parents JSON := '[]'::JSON;
BEGIN
    v_actor := msg_verify_token(p_token);

    IF v_actor = 'director:main' THEN
        v_kind := 'director';
    ELSIF v_actor LIKE 'teacher:%' THEN
        v_kind := 'teacher';
        v_id := substring(v_actor from 9);
    ELSIF v_actor LIKE 'parent:%' THEN
        v_kind := 'parent';
        v_id := substring(v_actor from 8);
    END IF;

    IF v_kind = 'director' THEN
        SELECT COALESCE(json_agg(json_build_object('id', 'teacher:' || id, 'name', full_name, 'phone', COALESCE(phone, ''), 'kind', 'teacher')), '[]')
        INTO v_teachers FROM teachers WHERE status = 'active';

        SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', 'ولي أمر ' || full_name, 'phone', parent_phone, 'kind', 'parent')), '[]')
        INTO v_parents FROM (
            SELECT DISTINCT ON (parent_phone) parent_phone, full_name
            FROM students
            WHERE parent_phone IS NOT NULL AND status = 'active'
            ORDER BY parent_phone, created_at DESC
        ) s;

    ELSIF v_kind = 'teacher' THEN
        SELECT COALESCE(json_agg(json_build_object('id', 'teacher:' || id, 'name', full_name, 'phone', COALESCE(phone, ''), 'kind', 'teacher')), '[]')
        INTO v_teachers FROM teachers WHERE id::TEXT != v_id AND status = 'active';

        -- سكرتارية المواعيد ترى جميع أولياء الأمور مثل المدير
        IF EXISTS (SELECT 1 FROM teachers WHERE id::TEXT = v_id AND role = 'schedule_secretary') THEN
            SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', 'ولي أمر ' || full_name, 'phone', parent_phone, 'kind', 'parent')), '[]')
            INTO v_parents FROM (
                SELECT DISTINCT ON (parent_phone) parent_phone, full_name
                FROM students
                WHERE parent_phone IS NOT NULL AND status = 'active'
                ORDER BY parent_phone, created_at DESC
            ) s;
        ELSE
            SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', 'ولي أمر ' || COALESCE(MAX(student_name), parent_phone), 'phone', parent_phone, 'kind', 'parent')), '[]')
            INTO v_parents FROM teacher_parent_access WHERE teacher_id = v_id::UUID GROUP BY parent_phone;
        END IF;

    ELSIF v_kind = 'parent' THEN
        -- ولي الأمر يرى مدرسي أبنائه + سكرتارية المواعيد النشطة
        SELECT COALESCE(json_agg(json_build_object('id', 'teacher:' || t.id, 'name', t.full_name, 'phone', COALESCE(t.phone, ''), 'kind', 'teacher')), '[]')
        INTO v_teachers
        FROM teachers t
        WHERE t.status = 'active' AND (
            t.id IN (SELECT DISTINCT teacher_id FROM teacher_parent_access WHERE parent_phone = v_id)
            OR t.role = 'schedule_secretary'
        );
    END IF;

    RETURN json_build_object('teachers', v_teachers, 'parents', v_parents);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION msg_create_conversation(p_token UUID, p_other TEXT)
RETURNS JSON AS $$
DECLARE
    v_actor TEXT;
    v_kind TEXT;
    v_other_kind TEXT;
    v_type TEXT;
    v_allowed BOOLEAN;
    v_existing JSON;
    v_me_name TEXT;
    v_them_name TEXT;
    v_new_conv JSON;
BEGIN
    v_actor := msg_verify_token(p_token);

    -- تحديد أنواع الأطراف
    IF v_actor = 'director:main' THEN v_kind := 'director';
    ELSIF v_actor LIKE 'teacher:%' THEN v_kind := 'teacher';
    ELSIF v_actor LIKE 'parent:%' THEN v_kind := 'parent'; END IF;

    IF p_other = 'director:main' THEN v_other_kind := 'director';
    ELSIF p_other LIKE 'teacher:%' THEN v_other_kind := 'teacher';
    ELSIF p_other LIKE 'parent:%' THEN v_other_kind := 'parent'; END IF;

    IF v_kind = 'director' THEN v_type := CASE WHEN v_other_kind = 'teacher' THEN 'director-teacher' ELSE 'director-parent' END;
    ELSIF v_kind = 'teacher' THEN v_type := CASE WHEN v_other_kind = 'teacher' THEN 'teacher-teacher' ELSE 'teacher-parent' END;
    ELSE
        IF v_other_kind = 'director' THEN v_type := 'director-parent';
        ELSIF v_other_kind = 'teacher' THEN v_type := 'teacher-parent';
        ELSE RAISE EXCEPTION 'parent-parent forbidden'; END IF;
    END IF;

    IF v_type = 'teacher-parent' THEN
        SELECT is_conversation_allowed(ARRAY[v_actor, p_other], v_type) INTO v_allowed;
        IF NOT v_allowed THEN RAISE EXCEPTION 'conversation not allowed'; END IF;
    END IF;

    -- التحقق من وجود محادثة مسبقاً
    SELECT row_to_json(c) INTO v_existing FROM conversations c WHERE v_actor = ANY(participants) AND p_other = ANY(participants) LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

    -- جلب الأسماء: لولي الأمر نعرض "ولي أمر <اسم طالب واحد>" بدل رقم الهاتف المجرد،
    -- باختيار طالب نشط حديث التسجيل إن أمكن (وإلا أي طالب مرتبط بنفس الرقم)
    IF v_kind = 'director' THEN v_me_name := 'إدارة المركز';
    ELSIF v_kind = 'teacher' THEN SELECT full_name INTO v_me_name FROM teachers WHERE id = substring(v_actor from 9)::UUID;
    ELSE
        SELECT full_name INTO v_me_name FROM students WHERE parent_phone = substring(v_actor from 8) ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1;
        IF v_me_name IS NOT NULL THEN v_me_name := 'ولي أمر ' || v_me_name; ELSE v_me_name := substring(v_actor from 8); END IF;
    END IF;

    IF v_other_kind = 'director' THEN v_them_name := 'إدارة المركز';
    ELSIF v_other_kind = 'teacher' THEN SELECT full_name INTO v_them_name FROM teachers WHERE id = substring(p_other from 9)::UUID;
    ELSE
        SELECT full_name INTO v_them_name FROM students WHERE parent_phone = substring(p_other from 8) ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1;
        IF v_them_name IS NOT NULL THEN v_them_name := 'ولي أمر ' || v_them_name; ELSE v_them_name := substring(p_other from 8); END IF;
    END IF;

    -- إنشاء المحادثة
    WITH inserted AS (
        INSERT INTO conversations (participants, participant_names, type, unread_counts)
        VALUES (ARRAY[v_actor, p_other], ARRAY[v_me_name, v_them_name], v_type, '{}'::JSONB)
        RETURNING *
    )
    SELECT row_to_json(inserted) INTO v_new_conv FROM inserted;

    RETURN v_new_conv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- تصحيح أسماء المحادثات الموجودة فعلاً (قبل هذا الإصلاح) لطرف ولي الأمر في كل منها
DO $$
DECLARE
    v_conv RECORD;
    v_idx INT;
    v_phone TEXT;
    v_name TEXT;
BEGIN
    FOR v_conv IN SELECT id, participants, participant_names FROM conversations LOOP
        FOR v_idx IN 1 .. array_length(v_conv.participants, 1) LOOP
            IF v_conv.participants[v_idx] LIKE 'parent:%' THEN
                v_phone := substring(v_conv.participants[v_idx] from 8);
                SELECT full_name INTO v_name FROM students WHERE parent_phone = v_phone ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1;
                IF v_name IS NOT NULL THEN
                    UPDATE conversations
                    SET participant_names[v_idx] = 'ولي أمر ' || v_name
                    WHERE id = v_conv.id;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;
