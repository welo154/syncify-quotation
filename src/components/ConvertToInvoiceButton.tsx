"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createInvoiceFromQuoteAction } from "@/app/actions/invoices";

export function ConvertToInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="button subtle"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createInvoiceFromQuoteAction(quoteId);
          if (res.id) router.push(`/invoices/${res.id}`);
          else if (res.error) alert(res.error);
        })
      }
    >
      {pending ? "Creating…" : "Create invoice"}
    </button>
  );
}
