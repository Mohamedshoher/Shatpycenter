-- إضافة حقل الرد على الملحوظات
alter table if exists student_notes
  add column if not exists reply text,
  add column if not exists replied_by text,
  add column if not exists replied_at timestamp with time zone;
