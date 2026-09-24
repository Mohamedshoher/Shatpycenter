# 🎓 نظام إدارة مركز الشاطبي التعليمي الشامل (Al-Shatibi LMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple?style=for-the-badge)

**نظام إدارة متكامل وعصري لمراكز تحفيظ القرآن الكريم والمؤسسات التعليمية الصغرى والمتوسطة**

</div>

---

## 📖 مقدمة تقنية (لنماذج الذكاء الاصطناعي)

هذا المشروع هو تطبيق ويب كامل (Full-stack) مبني باستخدام **Next.js 16** بنظام **App Router** مع **Turbopack**. يعتمد التطبيق على **Supabase** كقاعدة بيانات خلفية ونظام مصادقة (Auth). الواجهة مصممة بأسلوب عصري (Glassmorphism) باستخدام **Tailwind CSS 4** مع دعم كامل للغة العربية (RTL). التحسينات الأخيرة ركزت على تقليل حجم الحزمة (Bundle Size) وتحسين سرعة التحميل (Performance) باستخدام Server Components، Dynamic Imports، وإزالة المكتبات الثقيلة.

---

## ✨ المميزات المتقدمة

### 📈 نظام دورة الاختبارات الذكي (Exams Cycle)
- **توزيع آلي:** يتم اختيار 5 طلاب يومياً للاختبار بناءً على ترتيبهم الأبجدي ومجموعاتهم.
- **دورة أسبوعية:** الأسبوع 1 (طلاب 1-20)، الأسبوع 2 (طلاب 21-40) ثم تعاد الدورة.
- **إدارة الاستدراك:** يوم الأربعاء مخصص بالكامل "للاستدراك"؛ أي طالب مؤجل ينتقل آلياً لقائمة الأربعاء.
- **تبويب الأداء:** يعرض عدد الطلاب الذين لم يختبروا لكل نوع (جديد/ماضي قريب/بعيد) بشريط عكسي.
- **تهنئة واتساب:** إرسال رسالة تهنئة تتضمن اسم السورة والتقدير لكل نوع اختبار.

### 💰 الإدارة المالية المتكاملة (Finance)
- **صفحة مالية رئيسية:** ملخص الإيرادات والمصروفات ورواتب المدرسين مع نافذة حالة الرواتب ونافذة العجز.
- **صفحات فرعية:** `/finance/income` (تفاصيل الإيرادات)، `/finance/expenses` (تفاصيل المصروفات)، `/finance/teachers` (تفاصيل المدرسين المالية).
- **فلترة العهد (Custody Logic):** في تقارير الإيرادات، يتم إخفاء المبالغ التي حصلها المعلمون ولم يتم تسليمها بعد للإدارة.
- **بطاقة المعلم المالية:** واجهة مخصصة تعرض سجلات الرواتب، الخصومات، والمكافآت.

### 👥 إدارة الطلاب المتطورة
- **ترقيم آلي:** كل طالب يمتلك رقماً تسلسلياً ثابتاً.
- **نظام الأرشفة المحسن:** بطاقات طالب مختزلة، مع صلاحيات حذف نهائي للمدير فقط.
- **الطلاب الجدد (Pending):** نظام انتظار لمراجعة المدير قبل الاعتماد.
- **إذا لم يتم اختباره:** عرض الطلاب الذين لم يستوفوا النصاب الشهري مع فلتر حسب النوع والعدد المتبقي.

### 🔐 نظام تسجيل الدخول المحسن
- **أمان عالٍ:** التحقق من كلمات مرور المعلمين عبر قاعدة البيانات مباشرة.
- **لوحة مفاتيح رقمية (Numeric Keypad):** تظهر تلقائياً عند إدخال كلمات المرور على الموبايل.
- **أولوية لولي الأمر:** شاشة الدخول تفتح افتراضياً على تبويب "ولي الأمر".

### 📱 تحسينات الواجهة وتجربة المستخدم (UI/UX)
- **ثبات ارتفاع النوافذ:** نافذة تفاصيل المدرس بارتفاع ثابت (90vh) مع تمرير داخلي.
- **Lazy Loading:** تحميل التبويبات الثقيلة (الحضور، الراتب، التحصيل) عند الطلب فقط.
- **Server Component:** Dashboard Layout أصبح Server Component مع DashboardShell كعميل.
- **رسوم متحركة CSS:** استبدال Framer Motion بـ FadeIn/SlideIn CSS المخصصة (توفير 4.2 MB).

### 🤖 نظام الأتمتة والخصومات (Automation & Deductions)
- **خصومات تلقائية:** فحص يومي لتقارير المعلمين (12:30م) وخصم "ربع يوم" للتأخير.
- **إدارة مالية دقيقة:** دمج الخصومات والمكافآت وتتبع الديون (وسام "مدين").

### 🔗 واتساب (WhatsApp Integration)
- **تهنئة الاختبارات:** زر إرسال تهنئة مباشرة للطالب المتميز.
- **معالجة الأرقام:** دعم كل الصيغ (010, 02010, 00201, +201) مع تصحيح مفتاح الدورة (`02`).

---

## 🏗️ هيكلية المشروع (Project Structure)

```bash
src/
├── app/                  # مسارات Next.js (Dashboard, Parent, Login)
│   ├── (dashboard)/      # صفحات لوحة التحكم
│   │   ├── exams-report/ # تقارير الاختبارات
│   │   ├── finance/      # المالية (رئيسي + income + expenses + teachers)
│   │   └── ...
│   └── (auth)/           # صفحات المصادقة
├── features/             # الميزات الأساسية
│   ├── auth/             # خدمات المصادقة وتسجيل الدخول
│   ├── students/         # إدارة الطلاب، الأرشفة، الخدمات
│   ├── teachers/         # المعلمين، سجلات حضورهم، الخصومات (مع Lazy Loading)
│   ├── groups/           # المجموعات وتوزيع المعلمين عليها
│   ├── finance/          # الإيرادات، المصروفات، ورواتب المعلمين
│   ├── chat/             # نظام المحادثة الفوري (Real-time Chat)
│   └── automation/       # محرك القواعد البرمجية (Rules Engine)
├── components/           # المكونات العامة
│   ├── layout/           # DashboardShell (Client Shell)
│   ├── ui/               # FadeIn, SlideIn, Modal
│   └── ...
├── lib/                  # دوال مساعدة (utils, supabase client, proxy)
├── store/               # إدارة الحالة (Zustand: useAuthStore, useUIStore)
└── supabase/            # ملفات الهجرة (migrations/indexes.sql)
```

---

## 🗄️ تفاصيل قاعدة البيانات (Database Schema)

تعتمد الجداول على علاقات UUID لضمان التكامل:
- `students`: تشمل `group_id`, `status` (active, archived, pending), `enrollment_date`.
- `teachers`: تشمل `role` (director, supervisor, teacher), `salary`, `accounting_type`, `password` (text).
- `exams`: سجلات الاختبارات (surah, exam_type, grade, date).
- `deductions`: لتخزين خصومات المعلمين (التلقائية واليدوية).
- `automation_rules`: لتخزين منطق القواعد البرمجية.

**تحسين قاعدة البيانات:**
- 25 فهرسة (Indexes) عبر 12 جدول لتحسين سرعة الاستعلامات.
- جميع استعلامات Supabase تسحب أعمدة محددة بدلاً من `select('*')`.

---

## 🚀 تحسينات الأداء (Performance Optimizations)

| التحسين | التوفير |
|---------|---------|
| إزالة Firebase (77 حزمة) | 29.5 MB |
| إزالة Framer Motion | 4.2 MB |
| إزالة مكتبات غير مستخدمة | ~7 MB |
| ضغط أيقونات PWA | 85% (73.9 KB → 10.8 KB) |
| إزالة tailwind-merge (استخدام clsx) | 24.2 KB |
| تحسين 32 استعلام `select('*')` | ~60% بيانات أقل |
| **الإجمالي** | **~45 MB** |

**تحسينات إضافية:**
- Dashboard Layout → Server Component (تقليل JS على 18 صفحة)
- 4 تابات ثقيلة في `TeacherDetailModal` → Dynamic Imports
- 2 مكون (`ArchiveList`, `ScheduleTab`) → Dynamic Imports
- 6 مودالات → Dynamic Imports
- 3 ملفات `loading.tsx` لـ (auth), (dashboard), parent
- PWA Caching: NetworkFirst لاستعلامات Supabase مع `networkTimeoutSeconds: 5`

---

## 🚀 التشغيل والتطوير

1. **تثبيت التبعيات:** `npm install`
2. **إعداد البيئة:** إنشاء ملف `.env.local` يحتوي على مفاتيح Supabase.
3. **التشغيل:** `npm run dev` (Turbopack)
4. **تحليل الحزمة:** `npm run analyze` (باستخدام `@next/bundle-analyzer`)
5. **فهارس Supabase:** تشغيل `supabase/migrations/indexes.sql` يدوياً عبر SQL Editor
6. **النشر:** التطبيق مهيأ للنشر المباشر على **Vercel**.

---

## 🔒 الصلاحيات (RBAC)

- **المدير (Director):** تحكم كامل (كلمة المرور الافتراضية: `996644`).
- **المشرف (Supervisor):** متابعة الحضور والاختبارات والتقارير.
- **المعلم (Teacher):** إدارة طلابه فقط، وتوزيع درجاتهم.
- **ولي الأمر (Parent):** واجهة مبسطة لمتابعة ابنه فقط.

---

## 📦 التقنيات المستخدمة (Tech Stack)

- **Framework:** Next.js 16.1.2 (App Router + Turbopack)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Data Fetching:** @tanstack/react-query
- **PWA:** @ducanh2912/next-pwa (runtime caching مخصص)
- **UI Transitions:** CSS (FadeIn, SlideIn) - بدون مكتبة خارجية
- **Icons:** Lucide React
- **Utilities:** clsx (بدلاً من tailwind-merge)

---

<div align="center">

**آخر تحديث: 27 مايو 2026**

</div>
