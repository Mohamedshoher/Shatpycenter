-- =========================================================================
-- إغلاق RLS الحقيقي: حذف سياسات "Public access" المفتوحة (using(true)
-- لأي طلب anon) من كل الجداول العادية.
-- =========================================================================
-- RLS كانت مفعّلة بالفعل على هذه الجداول؛ حذف السياسة بدون استبدالها
-- يعني رفض الوصول افتراضياً لأدوار anon و authenticated، بينما
-- service_role (المستخدَم حصرياً من الخادم عبر API routes الآن) يتجاوز
-- RLS دائماً بغض النظر عن السياسات.
--
-- تم التحقق أولاً أن كل الكتابة/القراءة المباشرة من المتصفح انتقلت إلى
-- API routes على الخادم (راجع .docs/supabase-organization-plan.md وPR
-- الهجرة)، وأن الخادم يستخدم SUPABASE_SERVICE_ROLE_KEY فعلياً في الإنتاج
-- قبل تطبيق هذا الملف.
-- =========================================================================

DROP POLICY IF EXISTS "Public access" ON teachers;
DROP POLICY IF EXISTS "Public access" ON groups;
DROP POLICY IF EXISTS "Public access" ON students;
DROP POLICY IF EXISTS "Public access" ON attendance;
DROP POLICY IF EXISTS "Public access" ON exams;
DROP POLICY IF EXISTS "Public access" ON fees;
DROP POLICY IF EXISTS "Public access" ON plans;
DROP POLICY IF EXISTS "Public access" ON financial_transactions;
DROP POLICY IF EXISTS "Public access" ON deductions;
DROP POLICY IF EXISTS "Public access" ON automation_rules;
DROP POLICY IF EXISTS "Public access" ON automation_logs;
DROP POLICY IF EXISTS "Public access" ON student_notes;
DROP POLICY IF EXISTS "Public access" ON teacher_attendance;
DROP POLICY IF EXISTS "Public access" ON leave_requests;
DROP POLICY IF EXISTS "Public access" ON free_exemptions;
DROP POLICY IF EXISTS "Public access" ON user_presence;
DROP POLICY IF EXISTS "Public access" ON notifications;
DROP POLICY IF EXISTS "Public access" ON exam_goals;
