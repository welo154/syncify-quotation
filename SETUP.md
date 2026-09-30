# Set up SYNCIFY Cloud

The app is implemented, but your Supabase database must be initialized before it can run against your project. No remote database deployment has been performed by this package.

## 1. Rotate the exposed secret key

A Supabase secret key was shared in the conversation. Rotate/revoke that key in Supabase API settings. This package contains only the project URL and publishable key. The secret key is not used or needed.

## 2. Create the database

1. Open your project in Supabase.
2. Open **SQL Editor > New query**.
3. Paste the entire contents of `supabase/001_initial.sql`.
4. Run the query. It creates the catalog, memberships, quotation tables, transactional functions and access policies.
5. The script is designed for a new project. If you already have tables with these names, review their definitions before running it; `CREATE TABLE IF NOT EXISTS` does not migrate an incompatible existing table.

## 3. Create your administrator

1. In **Authentication > Users**, create your own account with your chosen email and password. Use the dashboard's confirmation option, or complete the email confirmation process.
2. Open `supabase/002_add_member.sql`.
3. Replace `REPLACE_WITH_YOUR_ADMIN_EMAIL` with exactly that account's email.
4. Run it in SQL Editor. It grants the account the application admin role.
5. To add employees, create their Auth accounts and run the same script with `member_role := 'staff'`.
6. Disable public signup in Supabase Auth settings for this internal application. An unapproved Auth account has no catalog or quotation access even if it exists.

Do not put a password into the membership SQL or send it in chat. Application roles are separate from Supabase dashboard roles.

## 4. Run on your computer

This version uses JavaScript modules and authentication, so serve it over HTTP. Double-clicking index.html is no longer sufficient.

With Node.js installed, open a terminal in the `syncify-cloud` folder and run:

```sh
node server.mjs
```

Open **http://localhost:3000**. The Supabase browser library is bundled locally, so no npm install is necessary to run the app. Internet access to Supabase is required.

Alternative, if Python is installed:

```sh
python -m http.server 3000
```

## 5. Supabase authentication URLs

In Supabase **Authentication > URL Configuration**:

- Set Site URL to `https://syncify-quotation.vercel.app`.
- Add `http://localhost:3000/login.html` while developing locally.
- Add `https://syncify-quotation.vercel.app/login.html` for password reset links.
- Add a custom-domain login URL if you later use one.

Use exact domains you control. Password reset email delivery depends on your Supabase email/SMTP configuration and limits. Configure SMTP before using this with your team.

## 6. Vercel deployment

Deploy the contents of this folder as a static project:

- Framework preset: **Other**
- Build command: leave empty/disabled
- Output directory: `.`
- Root directory: the folder containing index.html

If deploying through GitHub, commit this directory, import that repository in Vercel and select these settings. Alternatively, with Vercel CLI installed, run `vercel` in this folder, complete account/project setup, then `vercel --prod` when ready.

This package includes `config.js` already populated with the supplied project URL and public publishable key. These are intended to be shipped to the browser; RLS and login enforce access. There are no secret deployment environment variables required for this static app.

Do not upload node_modules or test output. `.vercelignore` excludes setup/test files from hosting, while they remain available in this ZIP.

## 7. First quotation

1. Sign in with your admin account.
2. Open **Products** and add your real product codes and selling prices, or use the CSV template. The example row is illustrative; replace it before importing.
3. Open the quotation editor.
4. Search a product code/name and select a dropdown result.
5. Enter quantities. Use custom lines for installation or special services.
6. Save to cloud. The server assigns a unique quotation number.
7. Print / Save as PDF. Use A4, background graphics on, browser headers/footers off.
8. Finalize when ready to lock the quotation. Duplicate it to make a revised draft.

## Existing drafts

- At the same web origin as the old app, use **Import old browser drafts**.
- If the old app was opened from a local file, export JSON from it, then import the JSON into this version.
- Imports create new drafts. Dates reset to today. Quoted values are retained. Unmatched product references become custom lines.
- No name-based automatic catalog matching is performed.
- Re-importing the identical source JSON is prevented when saving by a per-user source fingerprint.
- Existing local client data is never uploaded automatically.

## Behavior to know

- Admins manage products and can access all quotations. Staff access their own quotations only.
- Archiving a product removes it from new selections. Historical lines retain their snapshots.
- Editing the catalog never updates quotation prices automatically.
- Unit prices can be overridden for one quotation without changing the catalog.
- Discount applies to included sections only; optional additions are not discounted.
- A product currency cannot change after it has been used; create another product code for a different currency.
- Currency is not converted. A catalog product must match the quotation currency.
- Maximum 80 sections, 100 items per section, 1000 items per quotation.
- CSV import is per row, not all-or-nothing. Successful and failed rows are explicitly reported. Existing codes are skipped unless updates are enabled.
- Quotation save is atomic and detects stale edits. On conflict, export your unsaved version before reloading the cloud record.
- Finalized quotations are read-only. Exporting JSON does not change the cloud record.
- JSON files can contain customer data; keep backups appropriately.
- Logo uploads are stored in each quotation snapshot, up to 1 MB. The supplied logo is included as an asset. No Supabase Storage bucket is required for this version.
- The quotation list shows the newest 100 accessible records.

## Troubleshooting

- **Database setup is not complete:** run the first migration.
- **Account not approved:** run the membership script for that Auth user.
- **Invalid login credentials:** check the account exists and has completed confirmation.
- **Duplicate code:** codes are uppercase and unique, including archived products.
- **CONFLICT:** another save changed the version. Export edits, reload and reconcile.
- **Network failure:** your changes remain in the current editor and its per-user recovery cache. They are not saved to cloud until confirmation appears.

## Verification

See `VERIFICATION.md`. Database tests use real PostgreSQL execution in PGlite with Supabase Auth/role stubs. Browser tests exercise the interface with a controlled backend adapter. Your production project, real sign-in and email delivery still need the setup steps above and a final live check.
