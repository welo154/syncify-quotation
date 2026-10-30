"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInvoiceAction } from "@/app/actions/invoices";
import { deleteQuoteAction } from "@/app/actions/quotes";

export function DeleteDocumentButton({
  kind,
  id,
  label,
}: {
  kind: "quote" | "invoice";
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button danger"
      disabled={pending}
      onClick={() => {
        const noun = kind === "quote" ? "quotation" : "invoice";
        if (!confirm(`Delete ${noun} ${label}? This cannot be undone.`)) return;
        startTransition(async () => {
          const result =
            kind === "quote"
              ? await deleteQuoteAction(id)
              : await deleteInvoiceAction(id);
          if (result?.error) {
            alert(result.error);
            return;
          }
          router.push(kind === "quote" ? "/" : "/invoices");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
