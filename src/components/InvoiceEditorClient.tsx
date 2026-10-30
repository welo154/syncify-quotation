"use client";

import {
  recordInvoicePrintAction,
  updateInvoiceAction,
} from "@/app/actions/invoices";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { CatalogProduct, InvoicePayload } from "@/lib/types";

export function InvoiceEditorClient({
  id,
  initial,
  meta,
  events,
  products,
}: {
  id: string;
  initial: InvoicePayload;
  meta: {
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
  events: {
    id: string;
    action: string;
    summary: string | null;
    at: string;
    user: { name: string };
  }[];
  products: CatalogProduct[];
}) {
  return (
    <DocumentEditor
      kind="invoice"
      documentId={id}
      initial={initial}
      meta={meta}
      events={events}
      numberField="invoiceNumber"
      dateField="invoiceDate"
      secondaryDateField="dueDate"
      numberLabel="Invoice number"
      dateLabel="Invoice date"
      secondaryDateLabel="Due date"
      totalLabel="AMOUNT DUE"
      previewKind="invoice"
      statusOptions={[
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
      ]}
      onSave={(payload) => updateInvoiceAction(id, payload as InvoicePayload)}
      onPrintRecord={() => recordInvoicePrintAction(id)}
      extraActions={
        <DeleteDocumentButton kind="invoice" id={id} label={initial.invoiceNumber} />
      }
      products={products}
    />
  );
}
