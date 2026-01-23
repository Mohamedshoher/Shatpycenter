-- 1. مسح الجداول القديمة (ترتيب المسح مهم بسبب العلاقات)
drop table if exists deductions cascade;
drop table if exists financial_transactions cascade;
drop table if exists plans cascade;
drop table if exists fees cascade;
drop table if exists exams cascade;
drop table if exists attendance cascade;
drop table if exists students cascade;
drop table if exists groups cascade;
drop table if exists teachers cascade;

-- 2. تفعيل إضافة UUID
create extension if not exists "uuid-ossp";

-- 3. إنشاء جدول المعلمين
create table teachers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text,
  role text default 'teacher', -- teacher, supervisor
  accounting_type text default 'fixed', -- fixed, partnership
  salary numeric default 0,
  partnership_percentage numeric default 0,
  password text,
  responsible_sections text[], -- array of sections like ['قرآن', 'نور بيان']
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. إنشاء جدول المجموعات
create table groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  teacher_id uuid references teachers(id),
  schedule text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. إنشاء جدول الطلاب بشكله النهائي
create table students (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  group_id uuid references groups(id),
  parent_phone text,
  status text default 'active', -- active, archived, suspended, pending
  monthly_amount numeric default 0,
  birth_date date,
  address text,
  appointment text, -- موعد الحضور المتفق عليه
  notes text,
  enrollment_date date, -- تاريخ الالتحاق المخصص
  archived_date date, -- تاريخ الأرشفة
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. إنشاء جدول الحضور
create table attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  date date not null,
  month_key text, -- e.g. '2025-01'
  status text not null, -- present, absent
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. إنشاء جدول الاختبارات
create table exams (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  surah text,
  exam_type text, -- new, review...
  grade text,
  date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. إنشاء جدول المصروفات
create table fees (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  month text,
  amount numeric,
  receipt_number text,
  date date,
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. إنشاء جدول الخطط اليومية
create table plans (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  date date,
  new_hifz text,
  prev_review text,
  distant_review text,
  status text, -- completed, partial...
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. إنشاء جدول المعاملات المالية
create table financial_transactions (
  id uuid default uuid_generate_v4() primary key,
  amount numeric not null,
  type text not null, -- 'income' | 'expense'
  category text,
  date date not null,
  description text,
  related_user_id uuid, -- student_id or teacher_id
  performed_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. إنشاء جدول الخصومات
create table deductions (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id),
  date date not null,
  amount numeric not null,
  reason text,
  applied_by text,
  status text default 'applied', -- applied, pending, appeals
  is_automatic boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. تفعيل الحماية (RLS) لجميع الجداول
alter table teachers enable row level security;
create policy "Public access" on teachers for all using (true);

alter table groups enable row level security;
create policy "Public access" on groups for all using (true);

alter table students enable row level security;
create policy "Public access" on students for all using (true);

alter table attendance enable row level security;
create policy "Public access" on attendance for all using (true);

alter table exams enable row level security;
create policy "Public access" on exams for all using (true);

alter table fees enable row level security;
create policy "Public access" on fees for all using (true);

alter table plans enable row level security;
create policy "Public access" on plans for all using (true);

alter table financial_transactions enable row level security;
create policy "Public access" on financial_transactions for all using (true);

alter table deductions enable row level security;
create policy "Public access" on deductions for all using (true);

-- 13. إنشاء جداول المحادثات والرسائل
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  participants text[] not null, -- مصفوفة من IDs المشاركين
  participant_names text[] not null, -- مصفوفة من أسماء المشاركين
  last_message text,
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  unread_counts jsonb default '{}'::jsonb,
  type text default 'director-teacher',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_role text not null,
  content text not null,
  read_by text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تفعيل RLS للمحادثات والرسائل
alter table conversations enable row level security;
create policy "Public access" on conversations for all using (true);

alter table messages enable row level security;
create policy "Public access" on messages for all using (true);

-- 14. إنشاء جدول حضور المعلمين
create table teacher_attendance (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id) on delete cascade,
  date date not null,
  status text not null, -- present, absent, quarter, half, quarter_reward, half_reward
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, date)
);

-- تفعيل RLS لحضور المعلمين
alter table teacher_attendance enable row level security;
create policy "Public access" on teacher_attendance for all using (true);

-- 15. إنشاء جدول قواعد الأتمتة
create table if not exists automation_rules (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null, -- deduction, absence, payment_due, etc.
  is_active boolean default true,
  conditions jsonb default '{}'::jsonb,
  actions jsonb default '{}'::jsonb,
  recipients text[],
  schedule jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. إنشاء جدول سجلات الأتمتة
create table if not exists automation_logs (
  id uuid default uuid_generate_v4() primary key,
  rule_id uuid references automation_rules(id) on delete set null,
  rule_name text,
  triggered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null, -- success, failed
  details text,
  affected_entity_id text, -- ID of teacher or student affected
  affected_entity_name text
);

-- تفعيل RLS للأتمتة
alter table automation_rules enable row level security;
create policy "Public access" on automation_rules for all using (true);

alter table automation_logs enable row level security;
create policy "Public access" on automation_logs for all using (true);

-- 17. إنشاء جدول ملحوظات الطلاب
create table if not exists student_notes (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  content text not null,
  type text not null, -- general, attendance, academic, behavior
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تفعيل RLS لملحوظات الطلاب
alter table student_notes enable row level security;
create policy "Public access" on student_notes for all using (true);
