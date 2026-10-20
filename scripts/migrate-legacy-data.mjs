import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function uid() {
  return randomBytes(4).toString("hex");
}

function moneyNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isoDay(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return String(d).slice(0, 10);
  return x.toISOString().slice(0, 10);
}

function normalizeLogo(logo) {
  if (!logo) return "/syncify-logo.png";
  if (logo.includes("syncify-logo")) return "/syncify-logo.png";
  return logo;
}

async function main() {
  const admin =
    (await prisma.user.findFirst({ where: { role: "admin", active: true } })) ||
    (await prisma.user.findFirst());

  if (!admin) {
    throw new Error("No studio user found. Run npm run db:seed first.");
  }

  console.log(`Using owner: ${admin.email} (${admin.id})`);

  const products = await prisma.$queryRawUnsafe(`
    SELECT id, code, name, category, description, unit, unit_price, currency, active, created_at, updated_at
    FROM public.products
    ORDER BY code
  `);

  let productUpserts = 0;
  for (const p of products) {
    await prisma.product.upsert({
      where: { code: String(p.code) },
      update: {
        name: String(p.name || "").slice(0, 300),
        category: String(p.category || "").slice(0, 120),
        description: String(p.description || "").slice(0, 2000),
        unit: String(p.unit || "piece").slice(0, 40),
        unitPrice: moneyNum(p.unit_price),
        currency: ["EGP", "USD", "EUR"].includes(p.currency) ? p.currency : "EGP",
        active: !!p.active,
      },
      create: {
        id: String(p.id),
        code: String(p.code),
        name: String(p.name || "").slice(0, 300),
        category: String(p.category || "").slice(0, 120),
        description: String(p.description || "").slice(0, 2000),
        unit: String(p.unit || "piece").slice(0, 40),
        unitPrice: moneyNum(p.unit_price),
        currency: ["EGP", "USD", "EUR"].includes(p.currency) ? p.currency : "EGP",
        active: !!p.active,
      },
    });
    productUpserts += 1;
  }
  console.log(`Products migrated: ${productUpserts}`);

  const quotes = await prisma.$queryRawUnsafe(`
    SELECT id, quotation_number, details, status, currency,
           discount_type, discount_value, created_at, updated_at
    FROM public.quotations
    ORDER BY created_at
  `);

  const sections = await prisma.$queryRawUnsafe(`
    SELECT id, quotation_id, name, optional, position
    FROM public.quotation_sections
    ORDER BY quotation_id, position
  `);

  const items = await prisma.$queryRawUnsafe(`
    SELECT id, section_id, product_code_snapshot, product_name_snapshot,
           category_snapshot, description_snapshot, quoted_unit_price, quantity, position
    FROM public.quotation_items
    ORDER BY section_id, position
  `);

  const sectionsByQuote = new Map();
  for (const s of sections) {
    const list = sectionsByQuote.get(s.quotation_id) || [];
    list.push(s);
    sectionsByQuote.set(s.quotation_id, list);
  }

  const itemsBySection = new Map();
  for (const i of items) {
    const list = itemsBySection.get(i.section_id) || [];
    list.push(i);
    itemsBySection.set(i.section_id, list);
  }

  let quoteCreates = 0;
  let quoteSkips = 0;

  for (const q of quotes) {
    const existing = await prisma.quote.findFirst({
      where: { quoteNumber: q.quotation_number },
    });
    if (existing) {
      quoteSkips += 1;
      continue;
    }

    const details = q.details && typeof q.details === "object" ? q.details : {};
    const quoteSections = (sectionsByQuote.get(q.id) || []).map((s) => ({
      id: uid(),
      name: String(s.name || "Section").slice(0, 120),
      optional: !!s.optional,
      locked: false,
      items: (itemsBySection.get(s.id) || []).map((it) => ({
        id: uid(),
        name: String(it.product_name_snapshot || "").slice(0, 300),
        category: String(it.category_snapshot || "").slice(0, 100),
        qty: moneyNum(it.quantity) || 1,
        price: moneyNum(it.quoted_unit_price),
        note: [it.product_code_snapshot, it.description_snapshot]
          .filter((x) => x && String(x).trim())
          .join(" · ")
          .slice(0, 500),
      })),
    }));

    // Always append locked Installation section for the new editor.
    quoteSections.push({
      id: uid(),
      name: "Installation",
      optional: false,
      locked: true,
      items: [],
    });

    const status =
      q.status === "finalized" ? "accepted" : String(q.status || "draft");

    const created = await prisma.quote.create({
      data: {
        quoteNumber: String(q.quotation_number),
        quoteDate: String(details.quoteDate || isoDay(q.created_at)),
        validUntil: String(details.validUntil || isoDay(q.created_at)),
        currency: ["EGP", "USD", "EUR"].includes(q.currency) ? q.currency : "EGP",
        clientName: String(details.clientName || ""),
        clientContact: String(details.clientContact || ""),
        projectName: String(details.projectName || ""),
        projectLocation: String(details.projectLocation || ""),
        companyName: String(details.companyName || "SYNCIFY"),
        companyPhone: String(details.companyPhone || ""),
        companyWeb: String(details.companyWeb || ""),
        logo: normalizeLogo(details.logo),
        discountType: ["none", "percent", "fixed"].includes(q.discount_type)
          ? q.discount_type
          : "none",
        discountValue: moneyNum(q.discount_value),
        discountAcknowledged: true,
        markupPercent: 0,
        installationPercent: 0,
        installationFree: false,
        clientNote: String(details.clientNote || ""),
        paymentTerms: String(details.paymentTerms || ""),
        warrantyTerms: String(details.warrantyTerms || ""),
        extraTerms: String(details.extraTerms || ""),
        sections: quoteSections,
        status,
        createdById: admin.id,
        updatedById: admin.id,
        createdAt: q.created_at instanceof Date ? q.created_at : new Date(q.created_at),
        updatedAt: q.updated_at instanceof Date ? q.updated_at : new Date(q.updated_at),
      },
    });

    await prisma.quoteEvent.create({
      data: {
        quoteId: created.id,
        userId: admin.id,
        action: "created",
        summary: `Migrated from legacy ${q.quotation_number}`,
      },
    });

    quoteCreates += 1;
  }

  console.log(`Quotes created: ${quoteCreates}, skipped existing: ${quoteSkips}`);
  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
