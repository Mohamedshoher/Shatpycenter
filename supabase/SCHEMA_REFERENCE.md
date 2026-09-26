# مرجع قاعدة البيانات الحقيقي — مركز الشاطبي

> **هذا الملف مصدره الاتصال المباشر بقاعدة البيانات الحية** (`phlzhndalzvksqudylrt`)، وليس تجميعًا يدويًا لملفات الـ migrations. حدّثه من نفس المصدر (`list_tables` + `pg_policies` + `pg_proc` عبر Supabase MCP) بعد أي migration جديدة، ولا تعدّله يدويًا فقط من الذاكرة.
>
> **آخر تحديث:** 2026-09-27 (بعد تطبيق migrations 010، 011، 017، 018، 019 — RLS مغلقة فعليًا الآن)

---

## 1. الجداول (21 جدولاً، كلها RLS مفعّلة و**مغلقة فعليًا أمام anon**)

منذ migration 019، لا يوجد أي سياسة تسمح لـ anon أو authenticated بالوصول لهذه الجداول. الوصول الوحيد المتبقي هو عبر الخادم (API routes) الذي يستخدم `SUPABASE_SERVICE_ROLE_KEY` (يتجاوز RLS دائمًا).

| الجدول | صفوف | الوصول |
|---|---:|---|
| `teachers` | 49 | 🔒 خادم فقط. يحتوي `password` بنص صريح — **لا تُرجعه أي API** (انظر `/api/teachers`) |
| `groups` | 20 | 🔒 خادم فقط |
| `students` | 983 | 🔒 خادم فقط. `is_orphan`/`is_azhari` أعمدة حقيقية (migration 012) |
| `attendance` | 71,148 | 🔒 خادم فقط. قيد فريد `(student_id, date)` فعّال (migration 011) |
| `exams` | 10,131 | 🔒 خادم فقط |
| `exam_goals` | 80 | 🔒 خادم فقط |
| `fees` | 3,753 | 🔒 خادم فقط. `collected_by_id` عمود حقيقي (migration 010) |
| `plans` | 0 | 🔒 خادم فقط |
| `financial_transactions` | 4,609 | 🔒 خادم فقط |
| `deductions` | 262 | 🔒 خادم فقط |
| `automation_rules` | 2 | 🔒 خادم فقط |
| `automation_logs` | 293 | 🔒 خادم فقط |
| `student_notes` | 470 | 🔒 خادم فقط |
| `teacher_attendance` | 573 | 🔒 خادم فقط |
| `leave_requests` | 6 | 🔒 خادم فقط |
| `free_exemptions` | 542 | 🔒 خادم فقط (كانت RLS معطّلة بالكامل، أُصلحت في 017 ثم أُغلقت في 019) |
| `user_presence` | 1 | 🔒 خادم فقط |
| `notifications` | 5 | 🔒 خادم فقط |
| `conversations` | 96 | 🔒 مقيّدة أصلًا (`auth.uid()`)، والوصول الفعلي عبر دوال RPC |
| `messages` | 641 | 🔒 نفس منطق `conversations` |
| `messaging_sessions` | 125 | 🔒 بدون أي سياسة أصلًا، محجوب تمامًا |

**خلاصة:** لا يوجد أي جدول عادي مكشوف لمفتاح anon العام بعد الآن. أي طلب مباشر من المتصفح (حتى لو معه المفتاح العام) سيُرفض من قاعدة البيانات نفسها. هذا استكمل ما بدأ في المرحلة 0.3 من `.docs/fix-plan.md`.

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
| **018** | `018_harden_functions_search_path.sql` | ✅ طُبِّق |
| **019** | `019_lock_down_rls_public_access.sql` (جديد) | ✅ **طُبِّق اليوم** — حذف كل سياسات `Public access` من 18 جدولاً |

> ملاحظة: سجل الـ migrations الرسمي داخل Supabase (`supabase_migrations.schema_migrations`) لا يزال فارغًا لأن كل التعديلات نُفِّذت مباشرة (SQL Editor / MCP) وليس عبر `supabase db push`. الملفات في `supabase/migrations/` تبقى المرجع الوثائقي المعتمد.

---

## 4. الوضع الحالي (اكتملت خطة القفل)

- ✅ كل الكتابة/القراءة المباشرة من المتصفح انتقلت إلى API routes على الخادم (راجع PR الهجرة).
- ✅ الخادم يستخدم `SUPABASE_SERVICE_ROLE_KEY` بدل مفتاح anon.
- ✅ سياسات `Public access` المفتوحة أُزيلت بالكامل (migration 019).

**المتبقي (خارج نطاق اليوم، تحسين مستقبلي اختياري):** كتابة سياسات RLS حقيقية دقيقة (مثلاً: معلم يرى طلابه فقط، ولي أمر يرى أبناءه فقط) كطبقة حماية إضافية على مستوى قاعدة البيانات نفسها، بدل الاعتماد فقط على منطق الصلاحيات داخل الـ API routes. هذا غير عاجل لأن كل الوصول الآن يمر عبر الخادم المُتحقَّق منه أصلًا.
