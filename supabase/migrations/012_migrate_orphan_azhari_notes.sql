-- =========================================================================
-- نقل وسوم يتيم وأزهري من الملاحظات النصية إلى أعمدة بولينية في جدول الطلاب
-- =========================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_orphan BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_azhari BOOLEAN DEFAULT FALSE;

UPDATE students
SET is_orphan = TRUE
WHERE (is_orphan IS NOT TRUE OR is_orphan IS NULL)
  AND (notes LIKE '%[يتيم]%' OR notes LIKE '%يتيم%');

UPDATE students
SET is_azhari = TRUE
WHERE (is_azhari IS NOT TRUE OR is_azhari IS NULL)
  AND (notes LIKE '%[أزهري]%' OR notes LIKE '%أزهري%');
