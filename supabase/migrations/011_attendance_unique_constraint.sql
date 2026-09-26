-- =========================================================================
-- تنظيف تكرارات سجلات الحضور وإضافة قيد فريد على (student_id, date)
-- =========================================================================
-- ملاحظة مهمة: id في هذا الجدول هو uuid عشوائي (uuid_generate_v4)، وليس
-- رقماً متسلسلاً. لذا لا يصح الاعتماد على مقارنة a.id < b.id لتحديد
-- "الأقدم"، لأن هذا يحذف صفاً عشوائياً وقد يُبقي حالة حضور مختلفة عمّا
-- تعرضه الواجهة فعلياً (التي تعتمد على created_at الأحدث - انظر
-- src/lib/attendance-utils.ts). نعتمد هنا على created_at الأحدث كمعيار
-- وحيد وموثوق للاحتفاظ بالسجل "الصحيح" لكل (student_id, date).

DELETE FROM attendance a
USING attendance b
WHERE a.student_id = b.student_id
  AND a.date = b.date
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id) -- كسر التعادل عند تطابق created_at تماماً
  );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;
