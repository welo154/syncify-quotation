import { prisma } from "@/lib/prisma";

export type DocumentNumberKind = "quote" | "invoice";

function prefixFor(kind: DocumentNumberKind) {
  return kind === "quote" ? "SYN" : "INV";
}

function lockKey(kind: DocumentNumberKind, year: number) {
  // Stable 32-bit advisory lock key per kind+year.
  const base = kind === "quote" ? 710_001 : 710_002;
  return base * 10_000 + (year % 10_000);
}

export function formatDocumentNumber(kind: DocumentNumberKind, year: number, n: number) {
  return `${prefixFor(kind)}-${year}-${String(n).padStart(3, "0")}`;
}

export async function allocateDocumentNumber(kind: DocumentNumberKind) {
  const year = new Date().getFullYear();
  const prefix = prefixFor(kind);

  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockKey(kind, year));
    return tx.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO studio."DocumentNumberCounter" (kind, year, "lastValue")
      VALUES (${kind}, ${year}, 1)
      ON CONFLICT (kind, year)
      DO UPDATE SET "lastValue" = studio."DocumentNumberCounter"."lastValue" + 1
      RETURNING "lastValue"
    `;
  });

  const n = Number(rows[0]?.lastValue ?? 0);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Failed to allocate ${prefix} number`);
  }
  return formatDocumentNumber(kind, year, n);
}
