# SYNCIFY Quotation Studio — Supabase edition

Your existing quotation layout, connected to a shared product catalog and cloud quotation storage.

**Start with [SETUP.md](SETUP.md).**

Features: Supabase login, protected admin catalog, editable unique product codes, searchable product selection, automatic price/code population, custom service lines, optional sections, discounts, immutable quotation snapshots, cloud save, version conflict detection, finalized quotation locking, JSON migration and A4 printing.

Run locally with `node server.mjs`, then open http://localhost:3000. Initialize Supabase using the SQL files before signing in. Public configuration is already in `config.js`.

The app is packaged for static hosting on Vercel. It has not been deployed to your Vercel or Supabase account.

The Supabase browser library is prebundled in vendor/. For development, `npm install`, then `npm run vendor` rebuilds it and `npm run test:db` runs the database checks. No npm install is needed for normal use of the packaged app.
