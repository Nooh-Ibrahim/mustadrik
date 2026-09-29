# Third-party notices

Mustadrik bundles the following third-party components. Each keeps its own license.

| Component | Where | License |
|---|---|---|
| [Electron](https://www.electronjs.org/) (runtime, includes Chromium and Node.js) | the installed app | MIT — Chromium's own notices ship as `LICENSES.chromium.html` next to the exe |
| [electron-updater](https://github.com/electron-userland/electron-builder) | the installed app | MIT |
| [Lucide icons](https://lucide.dev/) v1.17.0 | `src/assets/lucide.min.js` | ISC |
| [Tajawal](https://fonts.google.com/specimen/Tajawal) — Boutros Fonts | `src/assets/fonts/tajawal-*.woff2` | SIL Open Font License 1.1 |
| [Amiri](https://www.amirifont.org/) — Khaled Hosny | `src/assets/fonts/amiri-*.woff2` | SIL Open Font License 1.1 |

Online service (not bundled, used only when the user enters a city): prayer times from
[api.aladhan.com](https://aladhan.com/prayer-times-api).

The fonts are unmodified subsets served by Google Fonts. The SIL Open Font License 1.1 is available at
<https://openfontlicense.org>. The ISC license of Lucide is reproduced in the header of
`src/assets/lucide.min.js`.
