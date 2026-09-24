-- =========================================================================
-- جدول أهداف الاختبارات (Exam Goals)
-- =========================================================================

create table if not exists exam_goals (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade not null,
  exam_type text not null check (exam_type in ('جديد', 'ماضي قريب', 'ماضي بعيد')),
  title text not null,
  start_date date not null,
  end_date date not null,
  sessions_count integer default null,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_exam_goals_student_id on exam_goals(student_id);
create index if not exists idx_exam_goals_exam_type on exam_goals(exam_type);

alter table exam_goals enable row level security;
create policy "Public access" on exam_goals for all using (true);
