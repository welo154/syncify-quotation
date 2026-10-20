# SYNCIFY Studio

Staff quotations and invoices for SYNCIFY smart home projects. Next.js on Vercel with Neon Postgres and Auth.js.

## Features

- Staff login; admins create and manage users
- Shared quote and invoice history with created/edited-by audit trail
- Permanent installation section (% of products; complimentary option with original price shown)
- Internal markup % (staff-only control; client sees marked-up prices)
- Discount warning when above 7% (staff confirmation required)
- Room-prefixed item names on the client document
- Money formatting without trailing `.00`
- Convert a quotation into an invoice

## Setup

1. Create a Neon Postgres database and copy the connection string.
2. Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=...
AUTH_SECRET=...   # openssl rand -base64 32
ADMIN_EMAIL=admin@syncify.com
ADMIN_PASSWORD=your-secure-password
NEXTAUTH_URL=http://localhost:3000
```

3. Install and initialize:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

4. Open http://localhost:3000 and sign in with the admin credentials.

## Deploy on Vercel

1. Import the GitHub repo.
2. Add the same env vars (set `NEXTAUTH_URL` to your Vercel URL).
3. Deploy, then run seed once:

```bash
npx prisma db push
npm run db:seed
```

Or use the Vercel CLI / Neon integrate button so `DATABASE_URL` is injected automatically.
