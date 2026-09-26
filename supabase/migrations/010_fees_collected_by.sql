-- =========================================================================
-- إضافة عمود collected_by_id لجدول الرسوم
-- =========================================================================

ALTER TABLE fees ADD COLUMN IF NOT EXISTS collected_by_id UUID REFERENCES teachers(id);
