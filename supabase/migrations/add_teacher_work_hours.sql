-- =========================================================================
-- إضافة ساعات العمل اليومية وعدد أيام العمل الأسبوعية لكل معلم
-- =========================================================================

alter table teachers add column if not exists daily_hours numeric default 4;
alter table teachers add column if not exists weekly_working_days numeric default 5;
