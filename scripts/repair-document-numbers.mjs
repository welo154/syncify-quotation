import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseSuffix(value, prefix) {
  const match = String(value || "").match(new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`, "i"));
  if (!match) return null;
  return { year: Number(match[1]), n: Number(match[2]) };
}

function format(prefix, year, n) {
  return `${prefix}-${year}-${String(n).padStart(3, "0")}`;
}

async function repairKind({ kind, prefix, list, update }) {
  const byNumber = new Map();
  for (const row of list) {
    const key = row.number;
    if (!byNumber.has(key)) byNumber.set(key, []);
    byNumber.get(key).push(row);
  }

  const counters = new Map();
  for (const row of list) {
    const parsed = parseSuffix(row.number, prefix);
    if (!parsed) continue;
    counters.set(parsed.year, Math.max(counters.get(parsed.year) || 0, parsed.n));
  }

  let renumbered = 0;
  for (const [, group] of byNumber) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    for (const dup of group.slice(1)) {
      const year = new Date().getFullYear();
      const next = (counters.get(year) || 0) + 1;
      counters.set(year, next);
      const number = format(prefix, year, next);
      await update(dup.id, number);
      renumbered += 1;
      console.log(`Renumbered duplicate ${kind} ${dup.number} -> ${number}`);
    }
  }

  for (const [year, lastValue] of counters) {
    await prisma.$executeRaw`
      INSERT INTO studio."DocumentNumberCounter" (kind, year, "lastValue")
      VALUES (${kind}, ${year}, ${lastValue})
      ON CONFLICT (kind, year)
      DO UPDATE SET "lastValue" = GREATEST(studio."DocumentNumberCounter"."lastValue", EXCLUDED."lastValue")
    `;
  }

  console.log(`${kind}: repaired ${renumbered} duplicates; seeded ${counters.size} year counters`);
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS studio."DocumentNumberCounter" (
      kind text NOT NULL,
      year integer NOT NULL,
      "lastValue" integer NOT NULL DEFAULT 0,
      PRIMARY KEY (kind, year)
    )
  `);

  const quotes = await prisma.quote.findMany({
    select: { id: true, quoteNumber: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  await repairKind({
    kind: "quote",
    prefix: "SYN",
    list: quotes.map((q) => ({ id: q.id, number: q.quoteNumber, createdAt: q.createdAt.getTime() })),
    update: (id, quoteNumber) => prisma.quote.update({ where: { id }, data: { quoteNumber } }),
  });

  await repairKind({
    kind: "invoice",
    prefix: "INV",
    list: invoices.map((q) => ({
      id: q.id,
      number: q.invoiceNumber,
      createdAt: q.createdAt.getTime(),
    })),
    update: (id, invoiceNumber) => prisma.invoice.update({ where: { id }, data: { invoiceNumber } }),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
