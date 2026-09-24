-- إضافة عمود حالة القراءة لملحوظات الطلاب (إن لم يكن موجوداً)
alter table if exists student_notes
  add column if not exists is_read boolean default false;

create index if not exists idx_student_notes_is_read on student_notes(is_read);