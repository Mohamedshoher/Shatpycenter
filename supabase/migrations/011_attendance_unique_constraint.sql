-- =========================================================================
-- تنظيف تكرارات سجلات الحضور وإضافة قيد فريد على (student_id, date)
-- =========================================================================

DELETE FROM attendance a
USING attendance b
WHERE a.id < b.id
  AND a.student_id = b.student_id
  AND a.date = b.date;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;
