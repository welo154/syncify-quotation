import { daysLater, isoDate, uid } from "./money";
import type { DocumentPayload, InvoicePayload, QuotePayload, Section } from "./types";

export function blankSections(): Section[] {
  return [
    {
      id: uid(),
      name: "Reception & Dining",
      optional: false,
      items: [{ id: uid(), name: "", category: "", qty: 1, price: 0, note: "" }],
    },
    {
      id: uid(),
      name: "Installation",
      optional: false,
      locked: true,
      items: [],
    },
  ];
}

export function ensureInstallationSection(sections: Section[]): Section[] {
  const products = sections.filter((s) => !s.locked && s.name.toLowerCase() !== "installation");
  const installation: Section = {
    id: sections.find((s) => s.locked)?.id ?? uid(),
    name: "Installation",
    optional: false,
    locked: true,
    items: [],
  };
  return [...products, installation];
}

export function blankQuote(): QuotePayload {
  const today = isoDate();
  return {
    // Assigned atomically on create — never hardcode SYN-YYYY-001.
    quoteNumber: "",
    quoteDate: today,
    validUntil: daysLater(today, 7),
    currency: "EGP",
    clientName: "",
    clientContact: "",
    projectName: "",
    projectLocation: "",
    companyName: "SYNCIFY",
    companyPhone: "",
    companyWeb: "",
    logo: "/syncify-logo.png",
    discountType: "none",
    discountValue: 0,
    discountAcknowledged: false,
    markupPercent: 0,
    installationPercent: 10,
    installationFree: false,
    clientNote: "",
    paymentTerms: "",
    warrantyTerms: "",
    extraTerms: "",
    sections: blankSections(),
    status: "draft",
  };
}

export function blankInvoice(): InvoicePayload {
  const today = isoDate();
  return {
    // Assigned atomically on create — never hardcode INV-YYYY-001.
    invoiceNumber: "",
    invoiceDate: today,
    dueDate: daysLater(today, 14),
    currency: "EGP",
    clientName: "",
    clientContact: "",
    projectName: "",
    projectLocation: "",
    companyName: "SYNCIFY",
    companyPhone: "",
    companyWeb: "",
    logo: "/syncify-logo.png",
    discountType: "none",
    discountValue: 0,
    discountAcknowledged: false,
    markupPercent: 0,
    installationPercent: 10,
    installationFree: false,
    clientNote: "",
    paymentTerms: "",
    warrantyTerms: "",
    extraTerms: "",
    sections: blankSections(),
    status: "draft",
    sourceQuoteId: null,
  };
}

export function quoteToInvoice(quote: QuotePayload & { id?: string }): InvoicePayload {
  const today = isoDate();
  return {
    ...blankInvoice(),
    // Invoice number is allocated when the invoice row is created.
    invoiceNumber: "",
    invoiceDate: today,
    dueDate: daysLater(today, 14),
    currency: quote.currency,
    clientName: quote.clientName,
    clientContact: quote.clientContact,
    projectName: quote.projectName,
    projectLocation: quote.projectLocation,
    companyName: quote.companyName,
    companyPhone: quote.companyPhone,
    companyWeb: quote.companyWeb,
    logo: quote.logo,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    discountAcknowledged: quote.discountAcknowledged,
    markupPercent: quote.markupPercent,
    installationPercent: quote.installationPercent,
    installationFree: quote.installationFree,
    clientNote: quote.clientNote,
    paymentTerms: quote.paymentTerms,
    warrantyTerms: quote.warrantyTerms,
    extraTerms: quote.extraTerms,
    sections: ensureInstallationSection(
      JSON.parse(JSON.stringify(quote.sections)) as Section[]
    ),
    status: "draft",
    sourceQuoteId: quote.id ?? null,
  };
}

export function normalizeDocument<T extends DocumentPayload>(raw: T): T {
  return {
    ...raw,
    sections: ensureInstallationSection(
      Array.isArray(raw.sections) ? (raw.sections as Section[]) : blankSections()
    ),
    discountType: ["none", "percent", "fixed"].includes(raw.discountType)
      ? raw.discountType
      : "none",
    currency: ["EGP", "USD", "EUR"].includes(raw.currency) ? raw.currency : "EGP",
  };
}
