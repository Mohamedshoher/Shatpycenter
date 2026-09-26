-- =========================================================================
-- نظام المراسلة الداخلية (البديل للـ Edge Function) عبر دوال RPC
-- =========================================================================

-- 1. جدول لتخزين جلسات المراسلة (Tokens)
CREATE TABLE IF NOT EXISTS messaging_sessions (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- 2. دالة التحقق من الجلسة (للاستخدام الداخلي في الدوال الأخرى)
CREATE OR REPLACE FUNCTION msg_verify_token(p_token UUID)
RETURNS TEXT AS $$
DECLARE
    v_actor TEXT;
BEGIN
    SELECT actor INTO v_actor FROM messaging_sessions WHERE token = p_token AND expires_at > NOW();
    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    RETURN v_actor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. دالة تسجيل الدخول وإصدار التوكن
CREATE OR REPLACE FUNCTION msg_login(p_actor TEXT, p_passcode TEXT)
RETURNS UUID AS $$
DECLARE
    v_kind TEXT;
    v_id TEXT;
    v_valid BOOLEAN := false;
    v_token UUID;
    v_db_pass TEXT;
    v_phone TEXT;
BEGIN
    IF p_actor = 'director:main' THEN
        v_kind := 'director';
        v_id := 'main';
    ELSIF p_actor LIKE 'teacher:%' THEN
        v_kind := 'teacher';
        v_id := substring(p_actor from 9);
    ELSIF p_actor LIKE 'parent:%' THEN
        v_kind := 'parent';
        v_id := substring(p_actor from 8);
    ELSE
        RAISE EXCEPTION 'bad actor';
    END IF;

    IF v_kind = 'director' THEN
        IF p_passcode = '996644' THEN v_valid := true; END IF;
    ELSIF v_kind = 'teacher' THEN
        SELECT password INTO v_db_pass FROM teachers WHERE id = v_id::UUID;
        IF FOUND AND (v_db_pass IS NULL OR v_db_pass = p_passcode) THEN v_valid := true; END IF;
    ELSIF v_kind = 'parent' THEN
        SELECT parent_phone INTO v_phone FROM students WHERE parent_phone = v_id OR parent_phone = '02' || v_id LIMIT 1;
        IF FOUND THEN
            IF p_passcode = '123456' OR p_passcode = right(v_phone, 6) THEN
                v_valid := true;
                p_actor := 'parent:' || v_phone; -- توحيد المعرف
            END IF;
        END IF;
    END IF;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'invalid credentials';
    END IF;

    -- إنشاء التوكن
    INSERT INTO messaging_sessions (actor) VALUES (p_actor) RETURNING token INTO v_token;
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. دالة جلب جهات الاتصال المتاحة
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
        
        SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', full_name, 'phone', parent_phone, 'kind', 'parent')), '[]')
        INTO v_parents FROM (SELECT DISTINCT parent_phone, MAX(full_name) as full_name FROM students WHERE parent_phone IS NOT NULL AND status = 'active' GROUP BY parent_phone) s;

    ELSIF v_kind = 'teacher' THEN
        SELECT COALESCE(json_agg(json_build_object('id', 'teacher:' || id, 'name', full_name, 'phone', COALESCE(phone, ''), 'kind', 'teacher')), '[]') 
        INTO v_teachers FROM teachers WHERE id::TEXT != v_id AND status = 'active';
        
        -- سكرتارية المواعيد ترى جميع أولياء الأمور مثل المدير
        IF EXISTS (SELECT 1 FROM teachers WHERE id::TEXT = v_id AND role = 'schedule_secretary') THEN
            SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', full_name, 'phone', parent_phone, 'kind', 'parent')), '[]')
            INTO v_parents FROM (SELECT DISTINCT parent_phone, MAX(full_name) as full_name FROM students WHERE parent_phone IS NOT NULL AND status = 'active' GROUP BY parent_phone) s;
        ELSE
            SELECT COALESCE(json_agg(json_build_object('id', 'parent:' || parent_phone, 'name', 'ولي أمر ' || COALESCE(MAX(student_name), parent_phone), 'phone', parent_phone, 'kind', 'parent')), '[]')
            INTO v_parents FROM teacher_parent_access WHERE teacher_id = v_id::UUID GROUP BY parent_phone;
        END IF;

    ELSIF v_kind = 'parent' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. دالة جلب قائمة المحادثات
CREATE OR REPLACE FUNCTION msg_list_conversations(p_token UUID)
RETURNS JSON AS $$
DECLARE
    v_actor TEXT;
    v_result JSON;
BEGIN
    v_actor := msg_verify_token(p_token);
    SELECT COALESCE(json_agg(c ORDER BY COALESCE(c.last_message_at, c.created_at) DESC), '[]')
    INTO v_result
    FROM conversations c
    WHERE v_actor = ANY(c.participants);
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. دالة جلب رسائل محادثة معينة
CREATE OR REPLACE FUNCTION msg_get_messages(p_token UUID, p_conversation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_actor TEXT;
    v_result JSON;
    v_exists BOOLEAN;
BEGIN
    v_actor := msg_verify_token(p_token);
    
    SELECT EXISTS (SELECT 1 FROM conversations WHERE id = p_conversation_id AND v_actor = ANY(participants)) INTO v_exists;
    IF NOT v_exists THEN RAISE EXCEPTION 'forbidden'; END IF;

    SELECT COALESCE(json_agg(m ORDER BY created_at ASC), '[]')
    INTO v_result
    FROM messages m
    WHERE conversation_id = p_conversation_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. دالة إنشاء محادثة جديدة
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

    -- جلب الأسماء
    IF v_kind = 'director' THEN v_me_name := 'إدارة المركز';
    ELSIF v_kind = 'teacher' THEN SELECT full_name INTO v_me_name FROM teachers WHERE id = substring(v_actor from 9)::UUID;
    ELSE v_me_name := substring(v_actor from 8); END IF;

    IF v_other_kind = 'director' THEN v_them_name := 'إدارة المركز';
    ELSIF v_other_kind = 'teacher' THEN SELECT full_name INTO v_them_name FROM teachers WHERE id = substring(p_other from 9)::UUID;
    ELSE v_them_name := substring(p_other from 8); END IF;

    -- إنشاء المحادثة
    WITH inserted AS (
        INSERT INTO conversations (participants, participant_names, type, unread_counts)
        VALUES (ARRAY[v_actor, p_other], ARRAY[v_me_name, v_them_name], v_type, '{}'::JSONB)
        RETURNING *
    )
    SELECT row_to_json(inserted) INTO v_new_conv FROM inserted;

    RETURN v_new_conv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. دالة إرسال رسالة
CREATE OR REPLACE FUNCTION msg_send_message(p_token UUID, p_conversation_id UUID, p_content TEXT)
RETURNS JSON AS $$
DECLARE
    v_actor TEXT;
    v_exists BOOLEAN;
    v_name TEXT;
    v_role TEXT;
    v_new_msg JSON;
BEGIN
    v_actor := msg_verify_token(p_token);
    
    SELECT EXISTS (SELECT 1 FROM conversations WHERE id = p_conversation_id AND v_actor = ANY(participants)) INTO v_exists;
    IF NOT v_exists THEN RAISE EXCEPTION 'forbidden'; END IF;

    IF v_actor = 'director:main' THEN v_name := 'إدارة المركز'; v_role := 'director';
    ELSIF v_actor LIKE 'teacher:%' THEN SELECT full_name INTO v_name FROM teachers WHERE id = substring(v_actor from 9)::UUID; v_role := 'teacher';
    ELSE v_name := substring(v_actor from 8); v_role := 'parent'; END IF;

    WITH inserted AS (
        INSERT INTO messages (conversation_id, sender_id, sender_name, sender_role, content, read_by)
        VALUES (p_conversation_id, v_actor, COALESCE(v_name, 'مستخدم'), v_role, p_content, ARRAY[]::TEXT[])
        RETURNING *
    )
    SELECT row_to_json(inserted) INTO v_new_msg FROM inserted;

    RETURN v_new_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. دالة تعليم كمقروء
CREATE OR REPLACE FUNCTION msg_mark_read(p_token UUID, p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor TEXT;
    v_exists BOOLEAN;
BEGIN
    v_actor := msg_verify_token(p_token);
    
    SELECT EXISTS (SELECT 1 FROM conversations WHERE id = p_conversation_id AND v_actor = ANY(participants)) INTO v_exists;
    IF NOT v_exists THEN RAISE EXCEPTION 'forbidden'; END IF;

    UPDATE conversations
    SET unread_counts = jsonb_set(COALESCE(unread_counts, '{}'::JSONB), ARRAY[v_actor], '0')
    WHERE id = p_conversation_id;

    PERFORM mark_messages_read(p_conversation_id, v_actor);

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. دالة تثبيت رسالة
CREATE OR REPLACE FUNCTION msg_pin_message(p_token UUID, p_conversation_id UUID, p_message_id UUID, p_pin BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor TEXT;
    v_exists BOOLEAN;
BEGIN
    v_actor := msg_verify_token(p_token);
    
    SELECT EXISTS (SELECT 1 FROM conversations WHERE id = p_conversation_id AND v_actor = ANY(participants)) INTO v_exists;
    IF NOT v_exists THEN RAISE EXCEPTION 'forbidden'; END IF;

    UPDATE messages SET is_pinned = p_pin WHERE id = p_message_id AND conversation_id = p_conversation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
