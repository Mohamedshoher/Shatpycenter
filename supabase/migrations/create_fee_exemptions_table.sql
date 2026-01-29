-- جدول إعفاءات الرسوم (Fee Exemptions)
-- يُستخدم لحفظ الطلاب الذين تم العفو عنهم من دفع الرسوم لشهر معين

CREATE TABLE IF NOT EXISTS free_exemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- صيغة YYYY-MM
    amount DECIMAL(10, 2) NOT NULL,
    exempted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- منع تكرار الإعفاء لنفس الطالب في نفس الشهر
    UNIQUE(student_id, month)
);

-- فهرس للبحث السريع حسب الشهر
CREATE INDEX IF NOT EXISTS idx_free_exemptions_month ON free_exemptions(month);

-- فهرس للبحث حسب المدرس
CREATE INDEX IF NOT EXISTS idx_free_exemptions_teacher ON free_exemptions(teacher_id);

-- تمكين RLS (Row Level Security)
ALTER TABLE free_exemptions ENABLE ROW LEVEL SECURITY;

-- سياسة شاملة: السماح للمستخدمين المصادق عليهم بكل العمليات (قراءة، إضافة، حذف)
CREATE POLICY "Full access for authenticated users" ON free_exemptions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- تعليق: هذا الجدول يحفظ سجلات العفو عن الرسوم
-- عند العفو عن طالب، يتم إضافة سجل هنا وسيتم استثناؤه من حساب العجز الحقيقي
-- العفو يكون لشهر محدد فقط، لذلك يمكن العفو عن نفس الطالب في أشهر مختلفة
