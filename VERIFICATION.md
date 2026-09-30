# Verification — 30 September 2026

## Passed locally

- PostgreSQL execution through PGlite: unique normalized product codes; admin-only catalog writes; prevention of role escalation; quotation/child-table access isolation; anonymous access denied.
- Quotation arithmetic: 2 × 1,670 EGP, less 10%, gives 3,006 EGP; optional items are separate.
- Atomic quotation updates, rollback on invalid input, stale-version conflicts, preserved catalog snapshots, protection of used-product currency, finalized quotation immutability.
- Chromium browser with a controlled backend adapter: product dropdown fills code/name/price; quantity and discounts; saving; finalization locks editing; duplication unlocks a new draft; admin create/edit; sample quotation totals.
- Mobile viewport at 390 px: no horizontal page overflow after layout correction.
- No uncaught JavaScript errors in the tested browser flow after fixing dropdown redraw re-entry.
- Generated a four-page A4 test quotation and visually checked every page: logo, rows, repeated table headers, totals and payment terms render correctly.

Run database tests with `npm ci` then `npm run test:db`. Runtime use requires no dependency installation because the browser client is bundled.

## Not verified against your live account

No remote SQL migration, production sign-in, password reset email, real catalog write or Vercel deployment has been performed. The provided project connectivity check timed out. Browser checks used a simulated approved account and backend responses; they are not evidence of a working production Supabase connection.

After following SETUP.md, sign in, create one real product, save/reopen a quotation, and export its PDF. Confirm staff accounts can access only their own quotations before team rollout.
