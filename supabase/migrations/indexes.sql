-- ========================================
-- فهارس تحسين أداء الاستعلامات (Indexes)
-- تم إنشاؤها بناءً على تحليل الاستعلامات
-- ========================================

-- 1. الحضور (attendance) - الأكثر استخداماً
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance (date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_month_key ON attendance (month_key);

-- 2. المعاملات المالية (financial_transactions)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions (date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_date ON financial_transactions (type, date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions (category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_related_user ON financial_transactions (related_user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_category_date ON financial_transactions (type, category, date);

-- 3. خصومات المدرسين (deductions)
CREATE INDEX IF NOT EXISTS idx_deductions_teacher_id ON deductions (teacher_id);
CREATE INDEX IF NOT EXISTS idx_deductions_date ON deductions (applied_date);
CREATE INDEX IF NOT EXISTS idx_deductions_teacher_date ON deductions (teacher_id, applied_date);
CREATE INDEX IF NOT EXISTS idx_deductions_date_applied_by ON deductions (applied_date, applied_by);

-- 4. حضور المدرسين (teacher_attendance)
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON teacher_attendance (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance (date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date ON teacher_attendance (teacher_id, date);

-- 5. الاختبارات (exams)
CREATE INDEX IF NOT EXISTS idx_exams_student_id ON exams (student_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams (date);

-- 6. الرسوم (fees)
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees (student_id);
CREATE INDEX IF NOT EXISTS idx_fees_month ON fees (month);

-- 7. الإعفاءات (free_exemptions)
CREATE INDEX IF NOT EXISTS idx_free_exemptions_month ON free_exemptions (month);
CREATE INDEX IF NOT EXISTS idx_free_exemptions_student_id ON free_exemptions (student_id);
CREATE INDEX IF NOT EXISTS idx_free_exemptions_month_student ON free_exemptions (month, student_id);

-- 8. المجموعات (groups)
CREATE INDEX IF NOT EXISTS idx_groups_teacher_id ON groups (teacher_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups (name);

-- 9. الطلاب (students)
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students (group_id);

-- 10. الرسائل (messages)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id, created_at);

-- 11. المحادثات (conversations)
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participants);

-- 12. ملاحظات الطلاب (student_notes)
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON student_notes (student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_student_notes_created_at ON student_notes (created_at);
