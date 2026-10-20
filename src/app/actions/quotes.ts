"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { blankQuote, ensureInstallationSection, normalizeDocument } from "@/lib/document";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeTotals } from "@/lib/totals";
import type { QuotePayload, Section } from "@/lib/types";

function toPayload(row: {
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  currency: string;
  clientName: string;
  clientContact: string;
  projectName: string;
  projectLocation: string;
  companyName: string;
  companyPhone: string;
  companyWeb: string;
  logo: string;
  discountType: string;
  discountValue: number;
  discountAcknowledged: boolean;
  markupPercent: number;
  installationPercent: number;
  installationFree: boolean;
  clientNote: string;
  paymentTerms: string;
  warrantyTerms: string;
  extraTerms: string;
  sections: Prisma.JsonValue;
  status: string;
}): QuotePayload {
  return normalizeDocument({
    quoteNumber: row.quoteNumber,
    quoteDate: row.quoteDate,
    validUntil: row.validUntil,
    currency: row.currency,
    clientName: row.clientName,
    clientContact: row.clientContact,
    projectName: row.projectName,
    projectLocation: row.projectLocation,
    companyName: row.companyName,
    companyPhone: row.companyPhone,
    companyWeb: row.companyWeb,
    logo: row.logo,
    discountType: row.discountType as QuotePayload["discountType"],
    discountValue: row.discountValue,
    discountAcknowledged: row.discountAcknowledged,
    markupPercent: row.markupPercent,
    installationPercent: row.installationPercent,
    installationFree: row.installationFree,
    clientNote: row.clientNote,
    paymentTerms: row.paymentTerms,
    warrantyTerms: row.warrantyTerms,
    extraTerms: row.extraTerms,
    sections: ensureInstallationSection(row.sections as Section[]),
    status: row.status,
  });
}

export async function createQuoteAction() {
  const user = await requireUser();
  const blank = blankQuote();
  const quote = await prisma.quote.create({
    data: {
      ...blank,
      sections: blank.sections as unknown as Prisma.InputJsonValue,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  await prisma.quoteEvent.create({
    data: {
      quoteId: quote.id,
      userId: user.id,
      action: "created",
      summary: `Created ${quote.quoteNumber}`,
    },
  });
  revalidatePath("/");
  return { id: quote.id };
}

export async function updateQuoteAction(id: string, payload: QuotePayload) {
  const user = await requireUser();
  const data = normalizeDocument(payload);
  const totals = computeTotals(data);

  if (totals.discountExceedsLimit && !data.discountAcknowledged) {
    return { error: "Acknowledge the discount warning before saving." };
  }

  await prisma.quote.update({
    where: { id },
    data: {
      quoteNumber: data.quoteNumber,
      quoteDate: data.quoteDate,
      validUntil: data.validUntil,
      currency: data.currency,
      clientName: data.clientName,
      clientContact: data.clientContact,
      projectName: data.projectName,
      projectLocation: data.projectLocation,
      companyName: data.companyName,
      companyPhone: data.companyPhone,
      companyWeb: data.companyWeb,
      logo: data.logo,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAcknowledged: data.discountAcknowledged,
      markupPercent: data.markupPercent,
      installationPercent: data.installationPercent,
      installationFree: data.installationFree,
      clientNote: data.clientNote,
      paymentTerms: data.paymentTerms,
      warrantyTerms: data.warrantyTerms,
      extraTerms: data.extraTerms,
      sections: data.sections as unknown as Prisma.InputJsonValue,
      status: data.status,
      updatedById: user.id,
    },
  });

  await prisma.quoteEvent.create({
    data: {
      quoteId: id,
      userId: user.id,
      action: "updated",
      summary: `Updated ${data.quoteNumber} · ${data.clientName || "Untitled"}`,
    },
  });

  revalidatePath("/");
  revalidatePath(`/quotes/${id}`);
  return { ok: true };
}

export async function recordQuotePrintAction(id: string) {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return { error: "Not found" };

  const payload = toPayload(quote);
  const totals = computeTotals(payload);
  if (totals.discountExceedsLimit && !payload.discountAcknowledged) {
    return { error: "Acknowledge the discount warning before printing." };
  }

  await prisma.quoteEvent.create({
    data: {
      quoteId: id,
      userId: user.id,
      action: "printed",
      summary: `Printed ${quote.quoteNumber}`,
    },
  });
  return { ok: true };
}

export async function deleteQuoteAction(id: string) {
  await requireUser();
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/");
  return { ok: true };
}

export { toPayload as quoteRowToPayload };
