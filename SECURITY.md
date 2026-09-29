# Security & privacy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
[“Report a vulnerability”](https://github.com/Nooh-Ibrahim/mustadrik/security/advisories/new) form instead.
You will get a reply as soon as possible; fixes ship as a new release through the in-app updater.

## What the app sends over the network

Nothing about you. Mustadrik has no account, no server and no telemetry. The only network requests are:

1. **Prayer times** — `api.aladhan.com`, only when you enter a city in Settings (the request contains the
   city, country and calculation method you chose).
2. **Update check** — the installed version asks GitHub Releases of this repository whether a newer
   version exists (every few hours while running). The portable exe never checks.

## Where your data lives

- Everything is stored locally: `%APPDATA%\Mustadrik` (or `%APPDATA%\noah-dashboard` for installs that
  predate v11 — kept on purpose so upgrades never move your data).
- One automatic backup per day is written to the `backups` folder there (the newest 14 are kept),
  or to a folder you choose (e.g. one synced by Google Drive / OneDrive).
- Crash/error details are written only to `logs\errors.log` in the same folder. They never leave your device.
