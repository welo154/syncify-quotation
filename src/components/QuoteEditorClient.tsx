"use client";

import {
  recordQuotePrintAction,
  updateQuoteAction,
} from "@/app/actions/quotes";
import { ConvertToInvoiceButton } from "@/components/ConvertToInvoiceButton";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { CatalogProduct, QuotePayload } from "@/lib/types";

export function QuoteEditorClient({
  id,
  initial,
  meta,
  events,
  products,
}: {
  id: string;
  initial: QuotePayload;
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
      kind="quote"
      documentId={id}
      initial={initial}
      meta={meta}
      events={events}
      numberField="quoteNumber"
      dateField="quoteDate"
      secondaryDateField="validUntil"
      numberLabel="Quotation number"
      dateLabel="Issued"
      secondaryDateLabel="Valid until"
      totalLabel="QUOTE TOTAL"
      previewKind="quotation"
      statusOptions={[
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "accepted", label: "Accepted" },
        { value: "rejected", label: "Rejected" },
      ]}
      onSave={(payload) => updateQuoteAction(id, payload as QuotePayload)}
      onPrintRecord={() => recordQuotePrintAction(id)}
      extraActions={
        <>
          <ConvertToInvoiceButton quoteId={id} />
          <DeleteDocumentButton kind="quote" id={id} label={initial.quoteNumber} />
        </>
      }
      products={products}
    />
  );
}
