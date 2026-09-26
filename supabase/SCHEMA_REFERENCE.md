# مرجع قاعدة البيانات الحقيقي — مركز الشاطبي

> **هذا الملف مصدره الاتصال المباشر بقاعدة البيانات الحية** (`phlzhndalzvksqudylrt`)، وليس تجميعًا يدويًا لملفات الـ migrations. حدّثه من نفس المصدر (`list_tables` + `pg_policies` + `pg_proc` عبر Supabase MCP) بعد أي migration جديدة، ولا تعدّله يدويًا فقط من الذاكرة.
>
> **آخر تحديث:** 2026-09-26 (بعد تطبيق migrations 010، 011، 017، 018)

---

## 1. الجداول (21 جدولاً، كلها RLS مفعّلة)

| الجدول | صفوف | سياسة anon | ملاحظة |
|---|---:|---|---|
| `teachers` | 49 | مفتوحة (`Public access`, ALL) | يحتوي `password` بنص صريح — **لا تُرجعه أي API** (انظر `/api/teachers`) |
| `groups` | 20 | مفتوحة | — |
| `students` | 983 | مفتوحة | `is_orphan`/`is_azhari` أعمدة حقيقية (بعد migration 012)، لا تعتمد على نص `notes` |
| `attendance` | 71,148 | مفتوحة | قيد فريد `(student_id, date)` **فعّال الآن** (migration 011)؛ استخدم `upsert` عند الكتابة |
| `exams` | 10,131 | مفتوحة | مرتبط بـ `exam_goals` عبر `goal_id` |
| `exam_goals` | 80 | مفتوحة | — |
| `fees` | 3,753 | مفتوحة | `collected_by_id` **عمود حقيقي الآن** (migration 010)، يربط بـ `teachers.id` |
| `plans` | 0 | مفتوحة | جدول فارغ حاليًا، غير مستخدم فعليًا |
| `financial_transactions` | 4,609 | مفتوحة | — |
| `deductions` | 262 | مفتوحة | — |
| `automation_rules` | 2 | مفتوحة | — |
| `automation_logs` | 293 | مفتوحة | — |
| `student_notes` | 470 | مفتوحة | — |
| `teacher_attendance` | 573 | مفتوحة | — |
| `leave_requests` | 6 | مفتوحة | — |
| **`free_exemptions`** | 542 | مفتوحة (**أُصلحت اليوم**، كانت RLS معطّلة بالكامل) | فيها الآن سياستان: `Public access` (anon) و`Full access for authenticated users` (قديمة، غير مؤثرة لأن التطبيق لا يستخدم Supabase Auth) |
| `user_presence` | 1 | مفتوحة | — |
| `notifications` | 5 | مفتوحة | — |
| `conversations` | 96 | **مقيّدة فعليًا** (`auth.uid() = ANY(participants)`) | التطبيق لا يستخدم Supabase Auth، فـ`auth.uid()` دائمًا NULL لطلبات anon → **anon محجوب فعليًا** من هذا الجدول مباشرة؛ كل الوصول الحقيقي يمر عبر دوال RPC (انظر تحت) |
| `messages` | 641 | **مقيّدة فعليًا** (نفس منطق `conversations`) | — |
| `messaging_sessions` | 125 | **بدون أي سياسة** = محجوب تمامًا لـ anon/authenticated | آمن؛ الوصول الوحيد عبر دوال RPC بصلاحية `SECURITY DEFINER` |

**خلاصة:** كل الجداول "مفتوحة" فعليًا لـ anon حاليًا (باستثناء نظام المراسلة الذي يعتمد تصميمًا مختلفًا بالكامل). هذا هو العمل التالي المخطط له (نقل الكتابات المباشرة من المتصفح إلى API routes ثم قفل RLS الحقيقي).

---

## 2. نظام المراسلة الداخلية — RPC فقط (Edge Function محذوف)

⚠️ كان هناك تطبيقان في المستودع قديمًا: Edge Function (`supabase/functions/messaging`) **لم يُنشر إطلاقًا** على هذا المشروع، وتم حذفه نهائيًا من المستودع لتفادي اللبس. **النظام الفعلي الوحيد** هو 12 دالة RPC، كلها `SECURITY DEFINER` (تتجاوز RLS عمدًا) مع `search_path` مثبّت الآن (migration 018):

| الدالة | الغرض |
|---|---|
| `msg_login(actor, passcode)` | تسجيل الدخول وإصدار توكن في `messaging_sessions` |
| `msg_verify_token(token)` | التحقق الداخلي من صلاحية التوكن |
| `msg_get_contacts(token)` | جهات الاتصال المسموح بها حسب الدور |
| `msg_list_conversations(token)` | قائمة المحادثات |
| `msg_get_messages(token, conversation_id)` | رسائل محادثة |
| `msg_create_conversation(token, other)` | إنشاء/جلب محادثة |
| `msg_send_message(token, conversation_id, content)` | إرسال رسالة |
| `msg_mark_read(token, conversation_id)` | تعليم كمقروء |
| `msg_pin_message(token, conversation_id, message_id, pin)` | تثبيت رسالة |
| `mark_messages_read(conversation_id, actor)` | مساعدة داخلية |
| `is_conversation_allowed(participants, type)` | التحقق من صلاحية إنشاء محادثة |
| `update_conversation_after_message()` | Trigger لتحديث آخر رسالة/عدادات غير المقروء |

**تنبيه مقصود ومتبقٍّ:** هذه الدوال قابلة للتنفيذ من `anon` و`authenticated` (ظاهر في تقرير الأمان). هذا متعمَّد وأساسي لتصميم النظام الحالي (تسجيل دخول بدون Supabase Auth حقيقي)، وتغييره يحتاج إعادة تصميم كاملة لنظام المراسلة — **خارج نطاق هذه الخطة**.

---

## 3. Migrations (17 ملف، كلها مطابقة للواقع الحي الآن)

| # | الملف | الحالة |
|---|---|---|
| 001–009 | الهيكل الأساسي + الإشعارات + أهداف الاختبارات | ✅ مطابق |
| 010 | `collected_by_id` بالرسوم | ✅ **طُبِّق اليوم مباشرة على القاعدة الحية** |
| 011 | قيد فريد بالحضور | ✅ **طُبِّق اليوم** (بعد تصحيح باگ: كان يعتمد على `id` عشوائي بدل `created_at`، وحُذفت 5,196 صف تكرار فعلي بالمعيار الصحيح) |
| 012 | نقل وسوم يتيم/أزهري | ✅ مطابق |
| 013–016 | RLS المراسلة + RPC + صلاحيات السكرتارية + الفهارس | ✅ مطابق |
| **017** | `017_fix_free_exemptions_rls.sql` (جديد) | ✅ طُبِّق اليوم |
| **018** | `018_harden_functions_search_path.sql` (جديد) | ✅ طُبِّق اليوم |

> ملاحظة: سجل الـ migrations الرسمي داخل Supabase (`supabase_migrations.schema_migrations`) لا يزال فارغًا لأن كل التعديلات نُفِّذت مباشرة (SQL Editor / MCP) وليس عبر `supabase db push`. الملفات في `supabase/migrations/` تبقى المرجع الوثائقي المعتمد.

---

## 4. الخطوة التالية (غير منفذة بعد، تحتاج قرارًا منفصلاً)

نقل كل استدعاء مباشر لـ `supabase.from(...)` من كود المتصفح (`src/features/*/services/*.ts`) إلى API routes على الخادم، ثم قفل سياسات `Public access` المفتوحة على الجداول العادية (غير المراسلة) بسياسات حقيقية. موثّق بالتفصيل في `.docs/fix-plan.md` (المرحلة 0.3) و`.docs/supabase-organization-plan.md`.
