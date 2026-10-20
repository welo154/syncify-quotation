"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  blankInvoice,
  ensureInstallationSection,
  normalizeDocument,
  quoteToInvoice,
} from "@/lib/document";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeTotals } from "@/lib/totals";
import type { InvoicePayload, QuotePayload, Section } from "@/lib/types";
import { quoteRowToPayload } from "./quotes";

function toPayload(row: {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
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
  sourceQuoteId: string | null;
}): InvoicePayload {
  return normalizeDocument({
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    currency: row.currency,
    clientName: row.clientName,
    clientContact: row.clientContact,
    projectName: row.projectName,
    projectLocation: row.projectLocation,
    companyName: row.companyName,
    companyPhone: row.companyPhone,
    companyWeb: row.companyWeb,
    logo: row.logo,
    discountType: row.discountType as InvoicePayload["discountType"],
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
    sourceQuoteId: row.sourceQuoteId,
  });
}

export async function createInvoiceAction() {
  const user = await requireUser();
  const blank = blankInvoice();
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: blank.invoiceNumber,
      invoiceDate: blank.invoiceDate,
      dueDate: blank.dueDate,
      currency: blank.currency,
      clientName: blank.clientName,
      clientContact: blank.clientContact,
      projectName: blank.projectName,
      projectLocation: blank.projectLocation,
      companyName: blank.companyName,
      companyPhone: blank.companyPhone,
      companyWeb: blank.companyWeb,
      logo: blank.logo,
      discountType: blank.discountType,
      discountValue: blank.discountValue,
      discountAcknowledged: blank.discountAcknowledged,
      markupPercent: blank.markupPercent,
      installationPercent: blank.installationPercent,
      installationFree: blank.installationFree,
      clientNote: blank.clientNote,
      paymentTerms: blank.paymentTerms,
      warrantyTerms: blank.warrantyTerms,
      extraTerms: blank.extraTerms,
      sections: blank.sections as unknown as Prisma.InputJsonValue,
      status: blank.status,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  await prisma.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      userId: user.id,
      action: "created",
      summary: `Created ${invoice.invoiceNumber}`,
    },
  });
  revalidatePath("/invoices");
  return { id: invoice.id };
}

export async function createInvoiceFromQuoteAction(quoteId: string) {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { error: "Quote not found." };

  const payload = quoteToInvoice({
    ...quoteRowToPayload(quote),
    id: quote.id,
  } as QuotePayload & { id: string });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: payload.invoiceNumber,
      invoiceDate: payload.invoiceDate,
      dueDate: payload.dueDate,
      currency: payload.currency,
      clientName: payload.clientName,
      clientContact: payload.clientContact,
      projectName: payload.projectName,
      projectLocation: payload.projectLocation,
      companyName: payload.companyName,
      companyPhone: payload.companyPhone,
      companyWeb: payload.companyWeb,
      logo: payload.logo,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      discountAcknowledged: payload.discountAcknowledged,
      markupPercent: payload.markupPercent,
      installationPercent: payload.installationPercent,
      installationFree: payload.installationFree,
      clientNote: payload.clientNote,
      paymentTerms: payload.paymentTerms,
      warrantyTerms: payload.warrantyTerms,
      extraTerms: payload.extraTerms,
      sections: payload.sections as unknown as Prisma.InputJsonValue,
      status: payload.status,
      sourceQuoteId: quoteId,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      userId: user.id,
      action: "created",
      summary: `Created from quote ${quote.quoteNumber}`,
    },
  });

  revalidatePath("/invoices");
  return { id: invoice.id };
}

export async function updateInvoiceAction(id: string, payload: InvoicePayload) {
  const user = await requireUser();
  const data = normalizeDocument(payload);
  const totals = computeTotals(data);

  if (totals.discountExceedsLimit && !data.discountAcknowledged) {
    return { error: "Acknowledge the discount warning before saving." };
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
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

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: id,
      userId: user.id,
      action: "updated",
      summary: `Updated ${data.invoiceNumber} · ${data.clientName || "Untitled"}`,
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function recordInvoicePrintAction(id: string) {
  const user = await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Not found" };

  const payload = toPayload(invoice);
  const totals = computeTotals(payload);
  if (totals.discountExceedsLimit && !payload.discountAcknowledged) {
    return { error: "Acknowledge the discount warning before printing." };
  }

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: id,
      userId: user.id,
      action: "printed",
      summary: `Printed ${invoice.invoiceNumber}`,
    },
  });
  return { ok: true };
}

export async function deleteInvoiceAction(id: string) {
  await requireUser();
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  return { ok: true };
}

export { toPayload as invoiceRowToPayload };
