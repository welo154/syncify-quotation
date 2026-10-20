"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createInvoiceAction } from "@/app/actions/invoices";

export function CreateInvoiceButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="button primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createInvoiceAction();
          if (res.id) router.push(`/invoices/${res.id}`);
        })
      }
    >
      {pending ? "Creating…" : "New invoice"}
    </button>
  );
}
