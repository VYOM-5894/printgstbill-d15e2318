## Goal
Package the GST Billing app as a downloadable desktop application (Electron) that runs **fully offline** — no Supabase, no internet required after install.

## Approach

### 1. Replace Supabase with local storage
The current app uses Supabase for auth + all data (invoices, customers, products, payments, settings). For true offline, this has to go.

- **Drop authentication entirely** — single-user desktop app, no login needed. Remove `/login` route, `useAuth`, auth-gates, sign-out button.
- **Replace Supabase queries with a local data layer** backed by **IndexedDB via Dexie** (works in Electron's Chromium without native modules — simpler than SQLite + better-sqlite3 which needs native rebuilds per platform).
- Build a thin `src/lib/db.ts` that exposes the same shape components currently use (e.g. `db.customers.list()`, `db.invoices.create()`), so route files need minimal changes.
- Server functions (`createServerFn`) are removed — everything runs client-side in the renderer. The `next_invoice_number` and `recalc_invoice_payment` logic moves into the JS data layer.

### 2. Electron shell
- Add `electron/main.cjs` with a `BrowserWindow` loading the built `dist/index.html`.
- Set `base: './'` in `vite.config.ts` so `file://` loading works.
- Switch from TanStack Start (SSR) to a static SPA build. Keep TanStack Router (client-side routing already works).
- Use `@electron/packager` to produce platform binaries.

### 3. Packaging
- Produce a Linux `.tar.gz` in `/mnt/documents/` so you can download and test.
- Note: building macOS `.dmg` or Windows `.exe` installers requires those host OSes; I can produce `.zip` bundles for macOS/Windows that you unpack and run.

## Tradeoffs & things you should know

- **Data lives on one device.** No cloud sync, no multi-device, no backups unless you export. I'll add a JSON export/import on the Settings page so you can back up manually.
- **Existing cloud data won't migrate automatically** — if you have invoices already in Supabase you want to keep, tell me and I'll add a one-time import.
- **Auth removal is irreversible in this codebase direction.** If you ever want multi-user/cloud again, it's a rebuild.
- **GST reports, PDF print, invoice numbering** all keep working — they're computed client-side already.

## Technical steps
1. Add Dexie; create `src/lib/db.ts` with tables matching current Supabase schema (customers, products, invoices, invoice_items, payments, company_settings).
2. Replace all `supabase.from(...)` calls across routes with `db.*` calls. Move invoice-number generation and payment-status recalc into JS.
3. Remove `/login`, `useAuth`, AppShell auth UI, auth middleware imports.
4. Switch Vite config: remove TanStack Start SSR, build as SPA, `base: './'`. Update `index.html` entry.
5. Add `electron/main.cjs`, set `package.json` `main`, add `electron` + `@electron/packager` dev deps.
6. Build, package for Linux, ship `.tar.gz` to `/mnt/documents/`.

## Confirm before I start
- OK to **delete all auth and Supabase code** from the app?
- OK to **start with an empty local database** (no migration from your current Supabase data)?
- Linux build first — want macOS/Windows `.zip` bundles too in the same pass?
