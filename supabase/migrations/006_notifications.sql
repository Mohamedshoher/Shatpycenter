-- =========================================================================
-- 20. جدول الإشعارات (Notifications System)
-- =========================================================================

create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id) on delete cascade,
  type text not null check (type in ('deduction', 'reward', 'system')),
  title text not null,
  message text not null,
  reason text default '',
  amount numeric default 0,
  related_date text default '',
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_teacher_id on notifications(teacher_id);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
create index if not exists idx_notifications_is_read on notifications(is_read);

alter table notifications enable row level security;
create policy "Public access" on notifications for all using (true);
