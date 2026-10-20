export type UserRole = "admin" | "staff";

export type DiscountType = "none" | "percent" | "fixed";

export type LineItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  price: number;
  note: string;
};

export type Section = {
  id: string;
  name: string;
  optional: boolean;
  locked?: boolean;
  items: LineItem[];
};

export type DocumentPayload = {
  currency: string;
  clientName: string;
  clientContact: string;
  projectName: string;
  projectLocation: string;
  companyName: string;
  companyPhone: string;
  companyWeb: string;
  logo: string;
  discountType: DiscountType;
  discountValue: number;
  discountAcknowledged: boolean;
  markupPercent: number;
  installationPercent: number;
  installationFree: boolean;
  clientNote: string;
  paymentTerms: string;
  warrantyTerms: string;
  extraTerms: string;
  sections: Section[];
};

export type QuotePayload = DocumentPayload & {
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  status: string;
};

export type InvoicePayload = DocumentPayload & {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  sourceQuoteId?: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
