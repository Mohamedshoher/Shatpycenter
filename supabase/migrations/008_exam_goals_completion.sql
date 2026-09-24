-- إضافة حقول إنهاء الهدف إلى جدول exam_goals
alter table exam_goals
  add column if not exists is_completed boolean default false,
  add column if not exists completed_by text default null,
  add column if not exists completed_at timestamp with time zone default null;
