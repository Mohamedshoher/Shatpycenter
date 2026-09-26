# خطة إصلاح مشروع «مركز الشاطبي» (Shatpycenter)

> هذا الملف موجَّه لنموذج ذكاء اصطناعي سيتولى الإصلاح. نفِّذ المراحل **بالترتيب**، ولا تنتقل لمرحلة قبل أن تنجح أوامر التحقق في نهاية المرحلة السابقة.

## سياق المشروع

- Next.js 16 (App Router، `--webpack`) + React 19 + TypeScript + Tailwind 4 + Supabase + React Query + Zustand + PWA.
- الواجهة عربية (RTL)، والتعليقات في الكود بالعربية؛ حافظ على هذا الأسلوب.
- الحالة الحالية عند المراجعة:
  - `npx tsc --noEmit` ← ينجح بدون أخطاء.
  - `npm run build` ← ينجح.
  - `npx eslint src` ← **676 مشكلة** (473 error و203 warning): 433 `no-explicit-any`، و186 `no-unused-vars`، و15 `set-state-in-effect`، و15 `exhaustive-deps`، و9 `preserve-manual-memoization`، و10 `prefer-const`، و4 `no-unescaped-entities`، و2 `no-img-element`، و2 `no-require-imports`.
- لا توجد أي اختبارات آلية في المشروع.

## قواعد عامة للنموذج المنفِّذ

1. لا تغيّر سلوكًا يراه المستخدم إلا ما تطلبه الخطة صراحةً.
2. كل تعديل على قاعدة البيانات يكون ملف migration جديدًا مرقّمًا داخل `supabase/migrations/` (مثل `010_...sql`)، ولا تعدّل ملفات migrations قديمة.
3. بعد كل مرحلة شغّل: `npx tsc --noEmit` و`npm run build` و`npx eslint src`، ويجب ألا يزيد عدد أخطاء lint عن السابق.
4. لا تضع أي مفاتيح أو كلمات مرور داخل الكود. استخدم متغيرات البيئة.
5. `public/sw.js` يولّده next-pwa أثناء البناء؛ لا تعدّله يدويًا.

---

## المرحلة 0: طوارئ أمنية (الأولوية القصوى)

### 0.1 مفتاح Supabase منشور داخل المستودع
- **الملفات:** `delete_iqra_data.ts` و`test_logs.ts` في جذر المشروع.
- **المشكلة:** فيهما رابط المشروع `phlzhndalzvksqudylrt.supabase.co` ومفتاح anon مكتوبان صراحةً. `delete_iqra_data.ts` يحذف مجموعات وطلابًا وحضورًا ومصروفات **باستخدام المفتاح العام**، وهذا دليل على أن أي شخص يملك المفتاح يستطيع حذف كل البيانات (انظر 0.3).
- **الإصلاح:**
  - احذف الملفين من المستودع، أو انقلهما إلى `scripts/` مع قراءة الإعدادات من `process.env`.
  - انقل الملفات المؤقتة إلى الحذف أيضًا: `logs_output.txt` (53KB) و`test_ascii_temp.pdf` (12MB).
  - **مهمة يدوية على صاحب المشروع (ليست على النموذج):** تدوير مفتاح anon/JWT secret من لوحة Supabase بعد الإصلاح، لأن المفتاح موجود في تاريخ git.

### 0.2 كلمات مرور ثابتة في الكود
- `src/features/auth/services/authService.ts:48` كلمة مرور المدير `996644` ثابتة في كود يُرسَل للمتصفح، فيراها أي زائر في حزمة JavaScript.
- نفس كلمة المرور موجودة في `supabase/migrations/messaging_rpc.sql` (`msg_login`) و`supabase/functions/messaging/index.ts`.
- كلمة مرور عامة `123456` تفتح حساب **أي ولي أمر** (`authService.ts:77`، `messaging_rpc.sql`، `functions/messaging/index.ts`). تحقق أيضًا من استخدامها في `src/app/parent/student/[id]/page.tsx` و`AddStudentModal.tsx` و`EditStudentModal.tsx`.
- `supabase/functions/messaging/index.ts:15` فيه سر افتراضي `"shatibi-messaging-secret"` لتوقيع HMAC. إذا لم يُضبط المتغير فيمكن لأي أحد تزوير التوكن.
- **الإصلاح:** احذف القيم الافتراضية. لو لم يُضبط `MESSAGING_SECRET` يجب أن ترفض الدالة العمل. انقل التحقق من كلمة مرور المدير للخادم (انظر المرحلة 1)، وألغِ كلمة المرور العامة `123456`.

### 0.3 سياسات RLS مفتوحة للجميع
- **الملف:** `supabase/migrations/supabase_schema.sql` الأسطر 160 إلى 341، و`006_notifications.sql` و`007_exam_goals.sql`.
- **المشكلة:** كل الجداول (teachers, students, attendance, exams, fees, financial_transactions, deductions, automation_*, student_notes, leave_requests, free_exemptions, notifications, exam_goals...) عليها `create policy "Public access" ... for all using (true)`. معنى ذلك أن مفتاح anon (الموجود في المتصفح) يملك صلاحية **قراءة وكتابة وحذف** كل شيء، بما فيها **عمود `teachers.password` بنص صريح**.
- جدول `messaging_sessions` (في `messaging_rpc.sql`) بدون RLS أصلًا، فيستطيع أي أحد قراءة التوكنات الصالحة وانتحال أي مستخدم في المراسلة.
- **الإصلاح:** تعتمد على المرحلة 1 (المصادقة الحقيقية). الخطة:
  1. migration جديد يفعّل RLS على `messaging_sessions` بدون أي policy لـ anon، ويسحب صلاحيات anon: `revoke all on messaging_sessions from anon, authenticated`.
  2. بعد تطبيق المرحلة 1: احذف كل سياسات `"Public access"`، واستبدلها بسياسات تعتمد على `auth.uid()`/`auth.jwt() ->> 'role'`، أو اجعل كل الوصول عبر API routes على الخادم باستخدام `SUPABASE_SERVICE_ROLE_KEY` (متغير خادم فقط، **ليس** `NEXT_PUBLIC_`).
  3. امنع قراءة `teachers.password` نهائيًا عن anon: `revoke select (password) on teachers from anon`، أو انقل كلمات المرور لجدول منفصل.

### 0.4 تسريب كلمات مرور المعلمين عبر API
- `src/app/api/teachers/route.ts:10,16,34` يُرجع `password` لكل المعلمين في JSON، وبدون أي تحقق من هوية الطالب.
- **الإصلاح:** احذف `password` من الـ select ومن الاستجابة. في `AddStaffModal.tsx` (الأسطر 62 و86) لا تعرض كلمة المرور الحالية؛ اجعل الحقل «تعيين كلمة مرور جديدة» فقط.

### 0.5 حفظ كلمة المرور في localStorage
- `src/features/auth/components/LoginForm.tsx:43,51,60` يخزّن كلمة المرور بنص صريح في `shatibi_last_pass` ويملؤها تلقائيًا.
- **الإصلاح:** احذف التخزين والقراءة، واحذف المفتاح القديم عند التحميل: `localStorage.removeItem('shatibi_last_pass')`.

### 0.6 حقن فلاتر PostgREST
- `authService.ts:63` و`functions/messaging/index.ts`: `.or(\`parent_phone.eq.${phone},parent_phone.eq.02${phone}\`)`، والمتغير `phone` يأتي من إدخال المستخدم بعد `parent-` بدون تحقق. إدخال فيه `,` أو `)` يغيّر الاستعلام.
- `src/app/api/attendance/route.ts:33` نفس الثغرة مع `monthKey`.
- **الإصلاح:** تحقّق بـ regex صارم قبل الاستعلام (`/^\d{10,14}$/` للهاتف و`/^\d{4}-\d{2}$/` للشهر)، أو استخدم `.in('parent_phone', [phone, '02'+phone])`.

### تحقق المرحلة 0
- `grep -rn "996644\|123456\|eyJhbGci\|shatibi-messaging-secret" --include=*.ts --include=*.tsx --include=*.sql .` لا يُرجع أي نتيجة في الكود (نتيجة في migration قديم مقبولة إذا أُلغي أثرها بـ migration جديد).

---

## المرحلة 1: المصادقة والتفويض

### 1.1 المصادقة كلها على جهة العميل (يمكن تجاوزها)
- `authService.ts`: كل التحقق يجري داخل المتصفح. `useAuthStore` (Zustand persist) يخزّن كائن `user` في `localStorage['auth-storage']`، و`AuthProvider.tsx` يثق فيه. **أي شخص يكتب في الـ console:**
  ```js
  localStorage.setItem('auth-storage', JSON.stringify({state:{user:{role:'director',uid:'x'}},version:0}))
  ```
  يصبح مديرًا.
- `src/proxy.ts` (middleware) لا يفعل شيئًا (`isPublicRoute` محسوب ولا يُستخدم)، والتعليق يشير إلى Firebase المحذوف.
- **الإصلاح المقترح (بالحد الأدنى من التغيير في الواجهة):**
  1. أنشئ `src/app/api/auth/login/route.ts` ينقل منطق `loginWithRole` للخادم، ويقرأ كلمة مرور المدير من `process.env.DIRECTOR_PASSWORD`. للمعلمين تُقارَن كلمة المرور بـ hash (bcrypt أو `crypt()` من pgcrypto). يجب إضافة migration يحوّل `teachers.password` إلى hash.
  2. عند النجاح يصدر الـ route جلسة موقّعة (JWT بمكتبة `jose` بسر `AUTH_SECRET`) في cookie `httpOnly; secure; sameSite=lax` تحمل `{role, teacherId, phone, responsibleSections}`.
  3. `src/proxy.ts`: يتحقق من الـ cookie لكل الصفحات عدا `/login`، ويعيد التوجيه عند غيابه. **وأزِل `api` من الاستثناء في `matcher`** حتى يتحقق من الـ API routes أيضًا، أو تحقّق داخل كل route بدالة مشتركة `requireSession(request, allowedRoles)` في `src/lib/auth-server.ts`.
  4. `useAuthStore` يبقى للعرض فقط، ويُملأ من `GET /api/auth/me` وليس من localStorage كمصدر للثقة.
  5. `logout` يحذف الـ cookie عبر `POST /api/auth/logout`.
  - **بديل أقوى إن رغب المالك:** الانتقال إلى Supabase Auth الحقيقي، فتعمل سياسات RLS مباشرة بـ `auth.uid()`.
- احذف `registerRoleAccount` و`getUserProfile` الوهميتين (mock) من `authService.ts` إن لم تكن مستخدمة (تحقق بـ grep)، واحذف `delay(800)` المصطنع.
- `useLogin.ts:62-72` يحتوي معالجة أكواد أخطاء Firebase (`auth/wrong-password`...) وهي كود ميت. احذفه. وحدّث `env.example.txt` ليحتوي متغيرات Supabase الفعلية بدل Firebase:
  `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY` و`SUPABASE_SERVICE_ROLE_KEY` و`AUTH_SECRET` و`DIRECTOR_PASSWORD`.

### 1.2 الـ API routes بلا أي تفويض
- كل ملفات `src/app/api/**/route.ts` (نحو 20 ملفًا) تقبل الطلبات من أي أحد، وتثق في بارامترات مثل `role=director` و`teacherId=...`. مثال: `api/dashboard/route.ts:7` يقرأ `role` من الـ query string، فيكفي إرسال `?role=director` للحصول على كل البيانات. و`api/deductions` يسمح لأي أحد بالإضافة والحذف والتعديل (POST/DELETE/PUT).
- **الإصلاح:** في كل route استدعِ `requireSession` واستخرج `role/teacherId` **من الجلسة** وليس من الـ query. طبّق مصفوفة الصلاحيات التالية (أكّدها مع المالك):
  - director: كل شيء.
  - supervisor: قراءة وكتابة المجموعات ضمن `responsibleSections`، بدون المالية.
  - teacher: مجموعاته وطلابه فقط، وتسجيل الحضور والاختبارات لهم.
  - schedule_secretary: المواعيد والطلاب المعلّقون.
  - parent: أبناؤه فقط (مطابقة `parent_phone`).
- `api/deductions` PUT/DELETE/POST: للمدير فقط. `applied_by` يؤخذ من الجلسة، وليس من الـ body.
- لا ترجع `error.message` الخام من قاعدة البيانات للعميل في الإنتاج؛ سجّله على الخادم وأرجع رسالة عامة.

### 1.3 المكوّنات تستدعي Supabase مباشرة من المتصفح
- الملفات `src/features/**/services/*.ts` و`src/lib/attendance-utils.ts` تستخدم `supabase` من `src/lib/supabase.ts` (مفتاح anon) للقراءة **والكتابة** مباشرة. بعد إغلاق RLS (0.3) ستفشل هذه الاستدعاءات.
- **الإصلاح:** اجرد الاستدعاءات بـ `grep -rn "from '@/lib/supabase'" src` وانقل كل عملية كتابة إلى API route محمي. القراءات أيضًا، أو اكتب سياسات RLS مناسبة إذا اختير Supabase Auth.
- `src/lib/supabase.ts:9` يطبع `console.log` بالرابط عند كل تحميل؛ احذفه.

### تحقق المرحلة 1
- بعد تسجيل الخروج: `curl http://localhost:3000/api/teachers` يُرجع 401.
- تعديل `localStorage['auth-storage']` يدويًا لا يمنح أي صلاحية.
- دخول معلم ثم طلب `/api/dashboard?role=director` لا يُرجع بيانات غير مجموعاته.

---

## المرحلة 2: أخطاء منطقية وأخطاء بيانات

### 2.1 تاريخ غير صالح يكسر جلب الحضور
- `src/lib/attendance-utils.ts:43`: `endDate = \`${year}-${month}-31\``. في شهور مثل فبراير (`2026-02-31`) وأبريل ويونيو وسبتمبر ونوفمبر (`-04-31`...) يرفض Postgres التاريخ (`date/time field value out of range`)، فتُرجع الدالة `{}` بصمت ويظهر الحضور فارغًا.
- **الإصلاح:** احسب آخر يوم فعلي: `new Date(year, month, 0).getDate()` (كما في `api/attendance/route.ts:28`)، أو استخدم `.lt('date', firstDayOfNextMonth)`.

### 2.2 اقتطاع صامت للبيانات عند 1000 صف
- Supabase/PostgREST يحدّ الاستجابة افتراضيًا بـ `max_rows` (عادة 1000)، و`.limit(30000)`/`.limit(100000)`/`.limit(10000)` **لا تتجاوز هذا الحد**. الأماكن المتأثرة:
  - `src/lib/attendance-utils.ts:51`
  - `src/app/api/attendance/route.ts:35`
  - `src/app/api/exams/route.ts:33`
  - `src/app/api/exam-goals/route.ts:24`
  - وأي `select` آخر بلا ترقيم على جداول كبيرة (attendance, fees, exams). ابحث بـ `grep -rn "\.select(" src` وافحص الجداول الكبيرة.
- **الإصلاح:** أنشئ دالة مساعدة واحدة `fetchAll(queryBuilderFactory, pageSize=1000)` في `src/lib/` تكرّر `.range(from, to)` حتى ينتهي الجلب (النمط موجود أصلًا في `api/archive-data/route.ts`)، واستخدمها في كل هذه الأماكن.

### 2.3 مشاكل المنطقة الزمنية (UTC مقابل توقيت مصر)
- 24 موضعًا تستخدم `new Date().toISOString().split('T')[0]` أو `.slice(0,7)` لحساب «اليوم/الشهر الحالي». `toISOString` يعمل بتوقيت UTC، فبين منتصف الليل و2 أو 3 صباحًا بتوقيت مصر يُسجَّل اليوم السابق، وفي أول يوم من الشهر يظهر الشهر السابق. أمثلة:
  `api/deductions/route.ts:42` و`api/dashboard/route.ts:13` و`discipline-log/page.tsx:19,49,181` و`automation/page.tsx:19` و`finance/page.tsx:435` و`students/pending/page.tsx:60,442` و`AddTransactionModal.tsx:50,112`.
  على الخادم (Vercel بتوقيت UTC) تتأثر أيضًا `getMonth()/getFullYear()` في `api/dashboard/route.ts:14-15`.
- **الإصلاح:** أضف في `src/lib/utils.ts` دالتين: `todayLocal()` و`currentMonthKey()` تعتمدان على `Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' })`، واستبدل بهما كل المواضع (`grep -rn "toISOString().split\|toISOString().slice" src`). راجع commit `10e2d4e` (إصلاح calcEndDate) لأنه عالج جزءًا مشابهًا؛ وحّد الحل.

### 2.4 حساب الرواتب (`src/features/teachers/services/salaryCalculation.ts`)
- السطور 98 و108 و118: `f.amount.replace(...)` يفترض أن `amount` نص؛ إذا جاء رقمًا من قاعدة البيانات **ينهار** الحساب (`replace is not a function`). **الإصلاح:** `Number(String(f.amount).replace(/[^0-9.]/g, '')) || 0` في دالة مساعدة `parseAmount`.
- السطر 144: إذا لم يكن للمعلم راتب يُفترض `1000` (`|| 1000`)، فتُحسب له خصومات ومستحقات على راتب وهمي. **الإصلاح:** استخدم `0` أو اعرض تحذيرًا بأن الراتب غير محدد.
- ربط المصروفات بالمحصِّل يعتمد على **مطابقة الاسم النصي** (`createdBy === teacher.fullName`). تغيير اسم المعلم أو تشابه اسمين يُفسد الحساب. **الإصلاح طويل المدى:** إضافة عمود `collected_by_id uuid` لجدول `fees` مع migration، والإبقاء على مطابقة الاسم كحل احتياطي للسجلات القديمة.
- `new Date(d.appliedDate)` في السطرين 176 و185 تتأثر بالمنطقة الزمنية (انظر 2.3). استخدم `d.appliedDate.slice(0,7)` إذا كان بصيغة `YYYY-MM-DD`.
- `students.find` داخل `filter` على كل الرسوم تعقيده O(n×m). ابنِ `Map` للطلاب مرة واحدة.
- `expectedExpenses` يستبعد الطلاب المؤرشفين حتى لو كانوا نشطين في الشهر المختار (تقارير الشهور السابقة تتغير بعد الأرشفة). استخدم `archivedDate` للمقارنة مع الشهر.
- **أضف اختبارات وحدة** لهذه الدالة (المرحلة 4) قبل التعديل وبعده.

### 2.5 استعلامات «احتياطية» تُخفي الأخطاء
- `api/teachers/route.ts:13` و`api/dashboard/route.ts:39`: إذا فشل الاستعلام **لأي سبب** يعاد استعلام بديل، بافتراض أن السبب عمود غير موجود. هذا يُخفي أخطاء حقيقية. **الإصلاح:** طبّق migrations `add_group_hours.sql` و`add_teacher_work_hours.sql` على قاعدة البيانات، ثم احذف المسار الاحتياطي.

### 2.6 `api/attendance` POST غير ذري
- `src/app/api/attendance/route.ts:70-83`: حذف ثم إدراج في خطوتين، فلو فشل الإدراج ضاع السجل، والطلبات المتزامنة تنشئ تكرارًا. **الإصلاح:** أضف قيدًا فريدًا `unique (student_id, date)` في migration (بعد تنظيف التكرارات)، ثم استخدم `.upsert(..., { onConflict: 'student_id,date' })`. تحقق من وجود نفس النمط في `attendanceService.ts` وخدمات الحضور الأخرى.

### 2.7 استنتاج «يتيم» من نص الملاحظات
- `api/students/route.ts:44-51`: `notesStr.includes('يتيم')` يجعل أي ملاحظة تحتوي الكلمة («ليس يتيمًا» مثلًا) تصنّف الطالب يتيمًا، فيؤثر ذلك على الإعفاءات المالية. **الإصلاح:** اعتمد على العمود `is_orphan` فقط، مع migration لمرة واحدة ينقل الوسم `[يتيم]` من الملاحظات إلى العمود. ونفس الشيء لـ `[أزهري]`.

### 2.8 `.gitignore` و PWA
- `public/sw.js` مُتتبَّع في git مع أنه يتولّد عند كل build، فيظهر كتعديل دائم. أضف `public/sw.js` و`public/sw.js.map` إلى `.gitignore` واحذفه من التتبع: `git rm --cached public/sw.js`.
- `next.config.ts`: قاعدة `supabase-api-cache` تخزّن استجابات REST لمدة 7 أيام، والقاعدة الأخيرة `/\/[a-z0-9\-_\/]*/i` تطابق **كل** الروابط بما فيها `/api/*`. النتيجة: بيانات مالية وشخصية مخزّنة على الجهاز يراها من يستخدم نفس الجهاز بعد الخروج، وبيانات قديمة تظهر بعد أي تعديل. **الإصلاح:** استثنِ `/api/` من كاش التنقل، وقلّل مدة كاش Supabase أو احذفه، وامسح الكاش عند تسجيل الخروج (`caches.delete(...)`).
- `nextConfig.turbopack: {}` بينما البناء بـ `--webpack`؛ هذا مقبول، لكن وثّق السبب (next-pwa لا يدعم turbopack).

---

## المرحلة 3: جودة الكود (ESLint)

نفّذها بعد المراحل السابقة، على دفعات صغيرة حسب المجلد:
1. `npx eslint src --fix` (يصلح 10 مشاكل تلقائيًا، منها `prefer-const`).
2. `no-unused-vars` (186 مشكلة): احذف المتغيرات والاستيرادات غير المستخدمة. مثال: `src/proxy.ts:12`.
3. `react-hooks/set-state-in-effect` (15) و`exhaustive-deps` (15) و`preserve-manual-memoization` (9): هذه قد تسبب **أخطاء فعلية** (رسم متكرر أو بيانات قديمة). راجع كل واحدة يدويًا؛ لا تكتفِ بإضافة الاعتماديات تلقائيًا.
4. `no-explicit-any` (433): عرّف أنواعًا لصفوف قاعدة البيانات. الملف `src/types/supabase.ts` **فارغ (0 سطر)**؛ ولّده بـ `supabase gen types typescript --project-id phlzhndalzvksqudylrt > src/types/supabase.ts` ومرّر `Database` إلى `createClient<Database>()`. ابدأ بالخدمات (`services/`) والـ API routes.
5. `no-require-imports` (2) و`no-img-element` (2) و`no-unescaped-entities` (4): إصلاحات مباشرة.
6. `console.log` (8 مواضع) احذفها أو اجعلها للتطوير فقط.

الهدف: `npx eslint src` بدون errors.

---

## المرحلة 4: الاختبارات والتنظيف

1. أضف Vitest: `npm i -D vitest` وسكربت `"test": "vitest run"`.
2. اكتب اختبارات وحدة على الأقل لـ:
   - `computeTeacherSalaryStats` (ثابت، نسبة، بدون راتب، amount رقمي ونصي، غياب نصف وربع يوم، مكافآت).
   - `calculateContinuousAbsence` في `src/lib/attendance-utils.ts`.
   - دوال التاريخ الجديدة (`todayLocal` و`currentMonthKey`) عند حدود منتصف الليل وبداية الشهر.
   - تحقق مدخلات تسجيل الدخول (الهاتف والشهر) ضد محاولات الحقن.
3. أضف GitHub Action (`.github/workflows/ci.yml`) يشغّل: `npm ci`، `npx tsc --noEmit`، `npx eslint src`، `npm test`، `npm run build`.
4. نظّف جذر المستودع: `logs_output.txt` و`test_ascii_temp.pdf` و`delete_iqra_data.ts` و`test_logs.ts` و`optimize-icons.ps1` (انقله إلى `scripts/` إن كان مطلوبًا).
5. حدّث `README.md` و`PWA-SETUP.md` بخطوات الإعداد الجديدة ومتغيرات البيئة.
6. رتّب ملفات migrations غير المرقّمة (`add_*.sql`، `messaging_*.sql`، `indexes.sql`) وحدّد ترتيب تطبيقها في README، أو أعد تسميتها بأرقام، مع التأكد من أنها مطبّقة فعلًا على الإنتاج قبل إعادة التسمية.

---

## ملخص الأولويات

| الأولوية | البند | الخطورة |
|---|---|---|
| 1 | 0.3 RLS مفتوحة و`messaging_sessions` مكشوفة | حرجة: حذف أو سرقة كل البيانات |
| 2 | 1.1 و1.2 مصادقة على العميل فقط وAPI بلا تفويض | حرجة: أي أحد يصبح مديرًا |
| 3 | 0.1 و0.2 و0.4 و0.5 مفاتيح وكلمات مرور مكشوفة | حرجة |
| 4 | 0.6 حقن فلاتر | عالية |
| 5 | 2.1 تاريخ `-31` و2.2 اقتطاع 1000 صف | عالية: بيانات ناقصة بصمت |
| 6 | 2.3 المنطقة الزمنية و2.4 الرواتب | متوسطة إلى عالية: أرقام مالية خاطئة |
| 7 | 2.5 إلى 2.8 | متوسطة |
| 8 | المرحلتان 3 و4 | تحسين وصيانة |

> **ملاحظة للمالك:** المرحلتان 0.3 و1 تغيّران طريقة الدخول وقد تكسران شاشات تعتمد على الوصول المباشر لقاعدة البيانات. طبّقهما أولًا على فرع Supabase تجريبي (branch) قبل الإنتاج، وخذ نسخة احتياطية من قاعدة البيانات.
