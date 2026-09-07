# Student Excuse System

أريد بناء موقع نظام استئذان للطلاب باستخدام React + Supabase + Tailwind، تصميم عصري بالعربي RTL

1. قاعدة البيانات (Supabase):

- جدول students: id, student_name, national_id (unique), class, excuses_count_this_month, last_excuse_reset

- جدول excuses: id, student_id, date, reason, status (pending/approved)

- جدول users_roles: national_id, role (parent/director/admin)

- كل بيانات الطلاب تحفظ في Supabase فقط، ممنوع حفظها في localStorage أو في الأكواد

- فعل RLS في Supabase

2. صفحة تسجيل الدخول لولي الأمر:

- 3 خانات: اسم الطالب، رقم الهوية، الفصل

- يتحقق من جدول students إذا البيانات مطابقة تماما يدخل

- إذا غير موجودة: رسالة "البيانات غير صحيحة، راجع إدارة المدرسة"

3. لوحة ولي الأمر بعد الدخول:

- يعرض اسم الطالب والفصل وعدد الاستئذانات المتبقية هذا الشهر (الحد 3)

- زر "طلب استئذان" - إذا وصل 3 يتعطل الزر ويظهر "استنفذت الحد الشهري"

- عند الطلب يسجل في جدول excuses ويزيد العداد

- يتم تصفير العداد تلقائيا بداية كل شهر

4. لوحة المدير:

- تسجيل دخول منفصل ببريد وكلمة سر آمنة (لا تستخدم اسم وهوية ثابتة في الكود)

- يقدر يشوف كل طلبات الاستئذان ويوافق/يرفض

- يقدر يضيف طلاب: إضافة يدوية أو رفع ملف Excel (يدعم xlsx)

- يقدر يشوف كل بيانات الطلاب ويبحث بالهوية أو الفصل

- إحصائيات: أكثر الفصول استئذانا، عدد الطلبات اليوم

5. لوحة الأدمن التقني (المطور):

- تسجيل دخول منفصل ومحمي بـ Supabase Auth وليس بأسماء ثابتة

- صلاحيات: تعديل إعدادات الموقع، النصوص، الألوان، حدود الاستئذان

- لا تضع API Key للـ AI داخل كود الواجهة أبدا، ضعه في Supabase Edge Functions كـ Environment Variable

- إذا أردت مساعد AI لتعديل الموقع، اعمل Function اسمها ai-assistant تستقبل أوامر الأدمن فقط

6. الحماية من لقطة الشاشة:

- استخدم CSS: user-select: none

- استخدم JavaScript: منع كليك يمين، ومنع PrintScreen

document.addEventListener('keyup', (e) => { if (e.key == 'PrintScreen') { navigator.clipboard.writeText(''); alert('عذرا، ممنوع لقطة الشاشة'); } })

- استخدم div يغطي الشاشة عند فقدان التركيز (visibilitychange)

- ملاحظة: الحماية في المتصفح ليست 100% لكنها تقلل المحاولات

7. الأمان المهم:

- لا تضع أي هويات مثل 1448 أو 12345 في الكود

- كل الصلاحيات من جدول users_roles

- استخدم Supabase Auth

التصميم: ألوان مدرسية هادئة، متجاوب للجوال، وخط Tajawal

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5103b01d-fc13-4220-8555-110d9d2a02c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
