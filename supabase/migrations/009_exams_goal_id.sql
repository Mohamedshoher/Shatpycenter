-- ربط الاختبارات بالأهداف
alter table exams
  add column if not exists goal_id uuid references exam_goals(id) on delete set null default null;

create index if not exists idx_exams_goal_id on exams(goal_id);
