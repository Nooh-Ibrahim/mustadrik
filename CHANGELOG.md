# سجل التغييرات · Changelog

## 11.0.0 — أول إصدار عام · First public release

**للمستخدمين الحاليين:** التحديث يحفظ كل بياناتك كما هي — نفس المجلد، نفس الملف الشخصي، نفس الإعدادات.
ثبّت فوق النسخة القديمة مباشرة. إن كنت تستعمل «المزامنة بمجلد» على أكثر من جهاز، حدِّث الأجهزة كلها.

### جديد
- **جولة تعريفية لأول تشغيل:** اسمك (اختياري)، لونك، ما تريد أن تراه (العبادات / الرياضة / رحلة السعي)،
  ومواقيت الصلاة مع **اقتراح طريقة الحساب تلقائياً من دولتك**.
- **٢٠ طريقة حساب رسمية** للمواقيت (مصر، أم القرى، الخليج، الأردن، المغرب، تركيا، ISNA…).
- **تحديث تلقائي** من GitHub للنسخة المثبّتة، ونسخة **محمولة** (Portable) لا تحتاج تثبيتاً.
- الاستيراد والاستعادة يأخذان **لقطة لحالتك الحالية أولاً** — فالاستعادة نفسها قابلة للتراجع.

### إصلاحات
- المواقيت كانت تُجلب (مع إشعار) في **كل تشغيل** بدل مرة أسبوعياً؛ وبلا إنترنت كان يظهر خطأ كل مرة.
- اسما طريقتَي «رابطة العالم الإسلامي» و«أمريكا الشمالية ISNA» كانا مقلوبين.
- الاستيراد كان **يدمج** الملف في بياناتك بدل أن يستبدلها.
- مهمة أُنشئت قبل أكثر من ٣٠ يوماً وأُنجزت اليوم كانت **تُحذف** في التشغيل التالي.
- الواجبات كانت تظهر «متأخرة» صباح يوم استحقاقها لمن هم غرب غرينتش.
- أول تشغيل كان يعرض «طقس الصباح» فوق الجولة التعريفية.
- نصوص الإشعارات صارت نصاً خالصاً (لا يمكن لاسمٍ مستورد أن يحقن HTML).

### تحت الغطاء
- Electron 33 (منتهي الدعم) ← **Electron 44**؛ electron-builder 26؛ صفر ثغرات في `npm audit`.
- المستخدمون الجدد: مجلد بيانات `%APPDATA%\Mustadrik`؛ الحاليون يبقون في مجلدهم.
- النسخ الاحتياطية: `mustadrik-backup-YYYY-MM-DD.json` بالتاريخ المحلي (القديمة ما زالت تُقرأ).
- ESLint، ٧٣ اختباراً آلياً، اختبار شامل يشغّل التطبيق الحقيقي، وCI على GitHub Actions.

---

**For existing users:** the update keeps all of your data — same folder, same profile, same settings.
Install over the old version. If you use folder sync on several PCs, update all of them.

- **New:** first-run onboarding (name, theme, which areas to show, prayer city with the calculation
  method suggested from the country); 20 official calculation methods; auto-update from GitHub for the
  installer plus a portable exe; import/restore snapshot your current state first.
- **Fixed:** prayer times re-fetched on every launch (the "weekly" date never parsed); ISNA/MWL labels
  were swapped; import merged instead of replacing; tasks finished today but created 30+ days ago were
  deleted; due-today tasks showed as overdue west of UTC; morning ritual stacked over onboarding;
  toasts are plain text.
- **Internals:** Electron 33 → 44, electron-builder 26, zero `npm audit` findings, ESLint, 73 automated tests,
  an end-to-end harness that drives the real app (including an old-version → new-version upgrade),
  GitHub Actions CI.

## 10.x — personal builds (2026)

The 10.x line was a single-user build and was not published. Highlights that carried over: focus timer
with a floating widget, task bank with steps and estimates, courses/terms/grades, habits and adhkar,
prayer tracker with lifetime qada planner, weekly review, snapshots, folder sync.
