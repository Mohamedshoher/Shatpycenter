-- =========================================================================
-- نظام المراسلة الداخلية - الإصلاح الأمني لسياسات RLS + أدوات التحقق
-- =========================================================================
-- ملاحظة أمنية:
-- نظام تسجيل الدخول الحالي لا يستخدم Supabase Auth الحقيقي، لذا لا يوجد
-- auth.uid() لأي مستخدم فعلي. السياسات أدناه تحجب الوصول المباشر للمفتاح
-- العام (anon) تماماً، بينما تتم كل العمليات المصرح بها عبر Edge Function
-- واحدة (messaging) تستخدم service_role وتتحقق من الهوية يدوياً.
-- هذه السياسات ستتفعّل تلقائياً لصالح أي مستخدم Supabase Auth حقيقي
-- مستقبلاً وتسمح له فقط بالوصول للمحادثات التي هو ضمن participants فيها.
-- =========================================================================

-- 1) توسعة القيم المسموحة في conversations.type --------------------------
-- تحديث القيم القديمة إن وجدت قبل إضافة القيد
UPDATE conversations
SET type = 'director-teacher'
WHERE type IS NULL OR type NOT IN ('director-teacher', 'director-parent', 'teacher-teacher', 'teacher-parent');

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_type_check
  CHECK (type IN ('director-teacher', 'director-parent', 'teacher-teacher', 'teacher-parent'));

-- 2) إضافة عمود is_pinned لجدول الرسائل إن لم يكن موجوداً -----------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- 3) View لحساب الربط بين المدرس وأولياء أمور طلابه -----------------------
CREATE OR REPLACE VIEW teacher_parent_access AS
SELECT DISTINCT
  g.teacher_id,
  s.parent_phone,
  s.id AS student_id,
  s.full_name AS student_name
FROM students s
JOIN groups g ON g.id = s.group_id
WHERE s.status = 'active' AND s.parent_phone IS NOT NULL;

-- 4) دالة التحقق من صلاحية إنشاء محادثة قبل الإدراج ----------------------
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

    RETURN EXISTS (
      SELECT 1 FROM teacher_parent_access
      WHERE teacher_id = teacher_id_val AND parent_phone = parent_phone_val
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) دالة تعليم الرسائل كمقروءة (تُستخدم من Edge Function) ---------------
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid, p_actor text)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(read_by, p_actor)
  WHERE conversation_id = p_conversation_id
    AND sender_id <> p_actor
    AND NOT (p_actor = ANY(read_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Trigger لتحديث unread_counts و last_message تلقائياً عند وصول رسالة --
CREATE OR REPLACE FUNCTION update_conversation_after_message()
RETURNS trigger AS $$
BEGIN
  UPDATE conversations
  SET last_message = NEW.content,
      last_message_at = NEW.created_at,
      unread_counts = (
        SELECT jsonb_object_agg(
          participant,
          CASE
            WHEN participant = NEW.sender_id
              THEN COALESCE((conversations.unread_counts->>participant)::int, 0)
            ELSE COALESCE((conversations.unread_counts->>participant)::int, 0) + 1
          END
        )
        FROM unnest(conversations.participants) AS participant
      )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation ON messages;
CREATE TRIGGER trigger_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_after_message();

-- 7) إصلاح RLS: حذف السياسات المفتوحة واستبدالها بسياسات مقيّدة -----------
DROP POLICY IF EXISTS "Public access" ON conversations;
DROP POLICY IF EXISTS "Public access" ON messages;

-- المحادثات: كل طرف يرى ويعدّل فقط المحادثات التي هو ضمن participants فيها
CREATE POLICY "participants select conversations"
ON conversations FOR SELECT
USING (auth.uid()::text = ANY(participants));

CREATE POLICY "participants insert conversations"
ON conversations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = ANY(participants)
  AND is_conversation_allowed(participants, type)
);

CREATE POLICY "participants update conversations"
ON conversations FOR UPDATE
USING (auth.uid()::text = ANY(participants))
WITH CHECK (auth.uid()::text = ANY(participants));

-- الرسائل: الوصول فقط لرسائل المحادثات التي هو ضمن participants فيها
CREATE POLICY "participants select messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid()::text = ANY(c.participants)
  )
);

CREATE POLICY "participants insert messages"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid()::text = ANY(c.participants)
  )
);

CREATE POLICY "participants update messages"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid()::text = ANY(c.participants)
  )
);

-- 8) فهارس لتسريع الاستعلامات --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING gin (participants);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- فهارس الجداول الأساسية التي يعتمد عليها View teacher_parent_access
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students (parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_group ON students (group_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups (teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);

-- =========================================================================
-- ملاحظة عن التحديث الفوري (Realtime):
-- الجدولان محميّان الآن بسياسات RLS تمنع المفتاح العام، ولا يوجد حالياً
-- أي مستخدم Supabase Auth حقيقي، لذا الاشتراك بـ Realtime بالمفتاح العام
-- غير ممكن (سيُرفض بسبب RLS). لذلك تعتمد الواجهة على استطلاع دوري قصير
-- عبر Edge Function المحمية بدلاً من ذلك، وهو مكافئ أمنياً.
-- عند تفعيل Supabase Auth حقيقياً يمكن تشغيل الاشتراك اللحظي عبر:
--   alter publication supabase_realtime add table messages;
-- وستعمل سياسات المشاركين أعلاه كفلتر تلقائي للمشتركين.
-- =========================================================================
