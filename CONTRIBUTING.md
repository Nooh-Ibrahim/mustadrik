# Contributing to Mustadrik

> **بالعربية باختصار:** شكراً لاهتمامك! شغّل `npm install` ثم `npm start`. قبل أي طلب دمج: `npm run lint` و`npm test`
> ويجب أن ينجحا. أهم قاعدة: **بيانات المستخدمين الحاليين مقدّسة** — أي تغيير في شكل البيانات يحتاج ترحيلاً واختباراً
> (انظر «قواعد البيانات» بالأسفل). الواجهة عربية أولاً (RTL)، والأرقام الظاهرة بالأرقام العربية عبر `arN()`.

## Getting started

Requirements: Windows 10/11, Node.js 22+ (24 LTS recommended).

```bash
npm install
npm start            # run the app from source
npm run lint         # ESLint (must be clean)
npm test             # unit tests (node --test, no extra dependencies)
npm run e2e:fresh    # drive the real app on a throwaway data folder (first-run scenario)
npm run dist         # build dist/Mustadrik-Setup-<version>.exe and the portable exe
```

`npm start -- --data-dir=C:\some\scratch\folder` runs the app on a separate data folder, so you never
touch your own data while developing.

## How the code is organised

```
main.js              Electron main process: window, tray, IPC, disk backups, auto-update, timer widget
preload.js           the only bridge to the renderer: window.noahAPI (contextIsolation + sandbox)
lib/main-helpers.js  pure main-process helpers (data folder, backup names, sync file) — unit-tested
src/index.html       the whole UI (pages are <div class="page">), strict Content-Security-Policy
src/styles.css       all styles (themes are body classes: t-terracotta, t-sage, …, plus .dark)
src/js/*.js          ~36 classic scripts, loaded in the order listed in index.html
src/capture.html     Ctrl+Alt+N quick-capture popup · src/hud.html floating timer widget
scripts/             build/dev tools (e2e harness, web bundle, icon + asset fetchers)
tests/               node --test suites; tests/fixtures holds SYNTHETIC data only
```

The renderer scripts are **classic scripts sharing one global scope**, not ES modules: functions are
called from inline `onclick="…"` attributes and from each other. Rules that follow from that:

- Put a new function in the module it belongs to; it becomes global automatically.
- ESLint knows every shared global (computed by `scripts/renderer-globals.js`), so `no-undef` still
  catches typos. `tests/handlers.test.js` checks that every function named in an inline handler exists.
- Any HTML you build from user text must go through `esc()`. Toasts (`notify`, `undoToast`,
  `actionToast`) already render plain text — do not pre-escape for them.
- Call `icons()` (batched) after inserting `data-lucide` icons — never `lucide.createIcons()` in a loop.
- Every card needs a stable `data-cid="…"` (layout settings are keyed on it).
- UI numerals are Arabic-Indic: use `arN(n)`. Dates from `<input type=date>`: `parseLocalDate()`;
  day keys: `localDateKey()` (never `toISOString().slice(0,10)`, which is the UTC day).

## Data rules (please read before touching storage)

The whole app state is one object `S` (`freshState()` in `src/js/core.js`), saved to IndexedDB
(`istidrak` → `profileState`) with a localStorage mirror.

1. **New fields** get a default in `migrate()` (`src/js/storage.js`) — it runs on every load and must be
   idempotent. Add a test to `tests/migrate.test.js` or `tests/data-safety.test.js`.
2. **Structural changes** (moving, renaming or deleting stored data) go into `DM_STEPS` in
   `src/js/migrate.js` with a bumped `DATA_VERSION`. A snapshot is taken automatically before each step.
3. Extend `tests/fixtures/legacy-state.json` if needed and run the upgrade test against an older build:
   `node scripts/e2e.js upgrade <folder of an older checkout or win-unpacked build>`.
4. These values are **frozen** because existing users' data depends on them — never change them:
   `PRIMARY_PROFILE_ID` (`'noah'`), the `LS_*` localStorage keys, the IndexedDB name `istidrak`,
   the legacy data folder name in `lib/main-helpers.js`, and `build.appId` in `package.json`
   (the installer upgrades in place because of it).

## Releasing

1. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
2. `npm run lint && npm test && npm run e2e:fresh`.
3. Push to `main`, then run the **Release** workflow (Actions tab). It builds on Windows and uploads the
   installer, the portable exe and `latest.yml` (read by the in-app updater) to release `v<version>`.

## Pull requests

Small, focused PRs are easiest to review. Describe what changed for the *user*, and include a screenshot
for UI changes. Please keep the calm, low-noise UX: new features should be opt-in and never shame the user.
