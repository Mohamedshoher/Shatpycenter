-- =========================================================================
-- 1. مسح الجداول القديمة (تهيئة قاعدة البيانات)
-- ملاحظة: الترتيب مهم جداً هنا لتجنب أخطاء العلاقات (Foreign Keys)
-- =========================================================================
drop table if exists free_exemptions cascade; -- تمت إضافة الجدول الجديد هنا
drop table if exists deductions cascade;
drop table if exists financial_transactions cascade;
drop table if exists plans cascade;
drop table if exists fees cascade;
drop table if exists exams cascade;
drop table if exists attendance cascade;
drop table if exists students cascade;
drop table if exists groups cascade;
drop table if exists teachers cascade;

-- =========================================================================
-- 2. إعدادات الإضافات (Extensions)
-- تفعيل إضافة توليد المعرفات الفريدة (UUID) بشكل تلقائي
-- =========================================================================
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 3. جدول المعلمين والمشرفين
-- =========================================================================
create table teachers (
  id uuid default uuid_generate_v4() primary key, 
  full_name text not null,                        
  phone text,                                     
  role text default 'teacher',                    
  accounting_type text default 'fixed',           
  salary numeric default 0,                       
  partnership_percentage numeric default 0,       
  password text,                                  
  responsible_sections text[],                    
  status text default 'active',                   
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 4. جدول المجموعات أو الحلقات
-- =========================================================================
create table groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,                             
  teacher_id uuid references teachers(id),        
  schedule text,                                  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 5. جدول الطلاب
-- =========================================================================
create table students (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,                        
  group_id uuid references groups(id),            
  parent_phone text,                              
  status text default 'active',                   
  monthly_amount numeric default 0,               
  birth_date date,                                
  address text,                                   
  appointment text,                               
  notes text,                                     
  enrollment_date date,                           
  archived_date date,                             
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 6. جدول حضور وغياب الطلاب
-- =========================================================================
create table attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),        
  date date not null,                             
  month_key text,                                 
  status text not null,                           
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 7. جدول الاختبارات والتقييم
-- =========================================================================
create table exams (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  surah text,                                     
  exam_type text,                                 
  grade text,                                     
  date date,                                      
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 8. جدول الرسوم والمصروفات المدرسية (الاشتراكات)
-- =========================================================================
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

-- =========================================================================
-- 9. جدول الخطط اليومية (سجل المتابعة الأكاديمية)
-- =========================================================================
create table plans (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  date date,                                      
  new_hifz text,                                  
  prev_review text,                               
  distant_review text,                            
  status text,                                    
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 10. جدول المعاملات المالية (الخزينة العامة)
-- =========================================================================
create table financial_transactions (
  id uuid default uuid_generate_v4() primary key,
  amount numeric not null,                        
  type text not null,                             
  category text,                                  
  date date not null,                             
  description text,                               
  related_user_id uuid,                           
  performed_by text,                              
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 11. جدول الخصومات (المطبقة على المعلمين)
-- =========================================================================
create table deductions (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id),
  date date not null,
  amount numeric not null,                        
  reason text,                                    
  applied_by text,                                
  status text default 'applied',                  
  is_automatic boolean default false,             
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 12. تفعيل سياسات الأمان للدفعة الأولى (RLS)
-- =========================================================================
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

-- =========================================================================
-- 13. جداول نظام المحادثات والرسائل الداخلي (Chat)
-- =========================================================================
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  participants text[] not null,                   
  participant_names text[] not null,              
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

alter table conversations enable row level security;
create policy "Public access" on conversations for all using (true);

alter table messages enable row level security;
create policy "Public access" on messages for all using (true);

-- =========================================================================
-- 14. جدول حضور وغياب المعلمين
-- =========================================================================
create table teacher_attendance (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id) on delete cascade,
  date date not null,
  status text not null,                           
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, date)                        
);

alter table teacher_attendance enable row level security;
create policy "Public access" on teacher_attendance for all using (true);

-- =========================================================================
-- 15. جدول قواعد النظام الآلي (Automation Rules)
-- =========================================================================
create table if not exists automation_rules (
  id uuid default uuid_generate_v4() primary key,
  name text not null,                             
  type text not null,                             
  is_active boolean default true,                 
  conditions jsonb default '{}'::jsonb,           
  actions jsonb default '{}'::jsonb,              
  recipients text[],                              
  schedule jsonb default '{}'::jsonb,             
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 16. جدول سجلات تشغيل النظام الآلي (Automation Logs)
-- =========================================================================
create table if not exists automation_logs (
  id uuid default uuid_generate_v4() primary key,
  rule_id uuid references automation_rules(id) on delete set null,
  rule_name text,
  triggered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null,                           
  details text,                                   
  affected_entity_id text,                        
  affected_entity_name text                       
);

alter table automation_rules enable row level security;
create policy "Public access" on automation_rules for all using (true);

alter table automation_logs enable row level security;
create policy "Public access" on automation_logs for all using (true);

-- =========================================================================
-- 17. جدول ملحوظات وسلوكيات الطلاب
-- =========================================================================
create table if not exists student_notes (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  content text not null,                          
  type text not null,                             
  created_by text,                                
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table student_notes enable row level security;
create policy "Public access" on student_notes for all using (true);

-- =========================================================================
-- 18. جدول طلبات الإجازة (للطلاب)
-- =========================================================================
create table if not exists leave_requests (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  start_date date not null,                       
  end_date date not null,                         
  reason text,                                    
  status text default 'pending',                  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table leave_requests enable row level security;
create policy "Public access" on leave_requests for all using (true);

-- =========================================================================
-- 19. جدول حالة تواجد المستخدمين (متصل / غير متصل)
-- =========================================================================
create table if not exists user_presence (
  user_id text primary key,                       
  last_seen timestamp with time zone default now(), 
  is_online boolean default false,                
  updated_at timestamp with time zone default now()
);

alter table user_presence enable row level security;
create policy "Public access" on user_presence for all using (true);

-- =========================================================================
-- 20. جدول إعفاءات الرسوم (Fee Exemptions) - تمت إضافته وتنسيقه
-- يُستخدم لحفظ الطلاب الذين تم العفو عنهم من دفع الرسوم لشهر معين
-- =========================================================================
create table if not exists free_exemptions (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid not null references students(id) on delete cascade,
    student_name text not null,
    teacher_id uuid not null references teachers(id) on delete cascade,
    month varchar(7) not null, -- صيغة YYYY-MM
    amount numeric not null, -- تم توحيده ليكون numeric بدلاً من decimal ليتوافق مع باقي الجداول
    exempted_by text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- منع تكرار الإعفاء لنفس الطالب في نفس الشهر
    unique(student_id, month)
);

-- فهارس (Indexes) لتسريع عمليات البحث في التقارير
create index if not exists idx_free_exemptions_month on free_exemptions(month);
create index if not exists idx_free_exemptions_teacher on free_exemptions(teacher_id);

-- تمكين حماية مستوى الصف (RLS) للجدول الجديد
alter table free_exemptions enable row level security;
create policy "Public access" on free_exemptions for all using (true);