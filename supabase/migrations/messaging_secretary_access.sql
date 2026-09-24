-- ============================================================
-- سكرتارية المواعيد في الشات الداخلي
-- 1) ترى جميع أولياء الأمور مثل المدير وتستطيع مراسلتهم
-- 2) أولياء الأمور يرون السكرتارية ضمن جهات الاتصال ويتواصلون معها
--
-- التطبيق: الصق هذا الملف كاملاً في Supabase Dashboard > SQL Editor ثم Run
-- ============================================================

-- 1) جهات الاتصال: السكرتارية ترى كل الأولياء + الأولياء يرون السكرتارية
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2) السماح بإنشاء محادثة بين السكرتارية وأي ولي أمر
CREATE OR REPLACE FUNCTION is_conversation_allowed(p_participants text[], p_type text)
RETURNS boolean AS $$
DECLARE
  teacher_id_val uuid;
  parent_phone_val text;
  i text;
BEGIN
  -- الأنواع المسموحة بلا قيد
  IF p_type IN ('director-teacher', 'director-parent', 'teacher-teacher') THEN
    RETURN true;
  END IF;

  -- teacher-parent: يجب أن يكون المدرس هو teacher_id لمجموعة بها أحد أبناء ولي الأمر
  IF p_type = 'teacher-parent' THEN
    FOREACH i IN ARRAY p_participants LOOP
      IF i LIKE 'teacher:%' THEN
        BEGIN
          teacher_id_val := split_part(i, ':', 2)::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
          teacher_id_val := NULL;
        END;
      END IF;
      IF i LIKE 'parent:%' THEN
        parent_phone_val := split_part(i, ':', 2);
      END IF;
    END LOOP;

    IF teacher_id_val IS NULL OR parent_phone_val IS NULL THEN
      RETURN false;
    END IF;

    -- سكرتارية المواعيد يُسمح لها بالتواصل مع جميع أولياء الأمور
    RETURN EXISTS (
      SELECT 1 FROM teacher_parent_access
      WHERE teacher_id = teacher_id_val AND parent_phone = parent_phone_val
    ) OR EXISTS (
      SELECT 1 FROM teachers WHERE id = teacher_id_val AND role = 'schedule_secretary'
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
